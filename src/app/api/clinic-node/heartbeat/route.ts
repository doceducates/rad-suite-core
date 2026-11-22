import { NextRequest, NextResponse } from 'next/server';
import {
  recordClinicHeartbeat,
  getClinicNodeStatus,
  getAllClinicNodes,
  dispatchClinicAction,
  type ClinicActionType,
} from '@/services/clinic-node.service';
import { indexHospitalPacsStudies } from '@/services/hospital-pacs-index.service';
import { inferModality } from '@/lib/modality-inference';
import { getClinicScriptManifest } from '@/services/clinic-node-manifest.service';
import { HeartbeatSchema } from './schema';


function isTokenAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const configuredSecret = process.env.CLINIC_NODE_SECRET?.trim();

  if (configuredSecret && configuredSecret.length > 0) {
    return token === configuredSecret || req.headers.get('x-clinic-token') === configuredSecret;
  }

  // Security Invariant: Require explicit secret in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const devSecret = 'clinic-secret-token';
  return token === devSecret || req.headers.get('x-clinic-token') === devSecret;
}

export async function GET(req: NextRequest) {
  if (!isTokenAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized clinic token' }, { status: 401 });
  }
  const nodeId = req.nextUrl.searchParams.get('nodeId') || undefined;
  const telemetry = getClinicNodeStatus(nodeId);
  const nodes = getAllClinicNodes();
  return NextResponse.json({ success: true, telemetry, nodes });
}

export async function PUT(req: NextRequest) {
  try {
    if (!isTokenAuthorized(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized clinic token' }, { status: 401 });
    }
    const body = await req.json();
    if (!body?.action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }
    const result = await dispatchClinicAction(
      body.action as ClinicActionType,
      { id: 'relay-dev', name: 'Localhost Dev Relay' },
      body.payload,
      body.nodeId
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isTokenAuthorized(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized clinic token' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = HeartbeatSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('[HEARTBEAT_VALIDATION_ERR]', JSON.stringify(parsed.error.errors));
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid heartbeat payload' },
        { status: 400 }
      );
    }

    let scriptVersion = '1.0.0';
    try {
      scriptVersion = getClinicScriptManifest().version;
    } catch {}

    const result = recordClinicHeartbeat({
      ...(parsed.data as any),
      orthancStatus: parsed.data.status,
      scriptVersion: parsed.data.scriptVersion || scriptVersion,
    });

    const hbNodeId = parsed.data.nodeId || 'clinic-pc-primary';
    const hbTelemetry = getClinicNodeStatus(hbNodeId);
    const rawAllowed = hbTelemetry?.harvestSchedule?.modalities || hbTelemetry?.syncRules?.allowedModalities || ['MR'];
    const allowedMods = rawAllowed.map((m: string) => (m === 'MRI' ? 'MR' : m.toUpperCase()));

    // Auto-index local and synced studies from clinic heartbeat into hospital_pacs_studies
    const toIndex: Array<any> = [];
    if (Array.isArray(parsed.data.localStudies)) {
      for (const ls of parsed.data.localStudies) {
        if (!ls?.accession) continue;
        const infMod = inferModality(ls.modality, ls.studyDescription, ls.patientName, ls.studyTime || ls.time);
        if (!allowedMods.includes('ALL') && !allowedMods.includes('*') && !allowedMods.includes(infMod)) {
          continue;
        }
        const totalSlices = ls.totalPacsSlices || ls.sliceCount;
        toIndex.push({
          accessionNumber: ls.accession,
          patientName: ls.patientName || 'PATIENT',
          patientId: ls.patientId || '',
          patientMrn: ls.patientId || '',
          modality: infMod,
          studyDate: ls.studyDate || '',
          studyTime: ls.studyTime || ls.time || '',
          studyDescription: ls.studyDescription || '',
          numInstances: totalSlices && totalSlices > 1 ? totalSlices : undefined,
          numSeries: ls.seriesCount && ls.seriesCount > 1 ? ls.seriesCount : (ls.numSeries && ls.numSeries > 1 ? ls.numSeries : (Array.isArray(ls.seriesList) && ls.seriesList.length > 1 ? ls.seriesList.length : undefined)),
          s3Status: ls.isSyncedToS3 ? 'synced' : (ls.state === 'on_pacs' ? 'pending' : 'local_only'),
          pacsSource: ls.state === 'on_pacs' ? 'HOSPITAL_PACS' : (parsed.data.nodeId || 'CLINIC_NODE'),
          rawTagsJson: JSON.stringify({
            patientAge: ls.patientAge,
            patientSex: ls.patientSex,
            patientBirthDate: ls.patientBirthDate,
            seriesList: ls.seriesList,
          }),
        });
      }
    }

    if (Array.isArray(parsed.data.syncedStudies)) {
      for (const ss of parsed.data.syncedStudies) {
        if (!ss?.accession) continue;
        const infMod = inferModality(ss.modality, ss.studyDescription || ss.description, ss.patientName, ss.studyTime || (ss.time && !ss.time.includes('T') ? ss.time : undefined));
        if (!allowedMods.includes('ALL') && !allowedMods.includes('*') && !allowedMods.includes(infMod)) {
          continue;
        }
        toIndex.push({
          accessionNumber: ss.accession,
          patientName: ss.patientName || 'PATIENT',
          patientId: ss.patientId || '',
          patientMrn: ss.patientId || '',
          modality: infMod,
          studyDescription: ss.studyDescription || ss.description || undefined,
          studyDate: ss.studyDate || '',
          studyTime: ss.studyTime || (ss.time && !ss.time.includes('T') ? ss.time : undefined),
          numInstances: ss.sliceCount && ss.sliceCount > 1 ? ss.sliceCount : (ss.numInstances && ss.numInstances > 1 ? ss.numInstances : undefined),
          numSeries: ss.seriesCount && ss.seriesCount > 1 ? ss.seriesCount : (ss.numSeries && ss.numSeries > 1 ? ss.numSeries : (Array.isArray(ss.seriesList) && ss.seriesList.length > 1 ? ss.seriesList.length : undefined)),
          s3Status: ss.status === 'synced' ? 'synced' : 'pending',
          pacsSource: parsed.data.nodeId || 'CLINIC_NODE',
          rawTagsJson: JSON.stringify({
            patientAge: ss.patientAge,
            patientSex: ss.patientSex,
            patientBirthDate: ss.patientBirthDate,
            seriesList: ss.seriesList,
          }),
        });
      }
    }

    if (toIndex.length > 0) {
      indexHospitalPacsStudies(toIndex).catch((err) => {
        console.warn('[CLINIC_HEARTBEAT_INDEX_WARN]', err);
      });
    }

    // Forward to standalone Clinic Gateway if configured
    const { forwardHeartbeatToGateway } = await import('@/services/clinic-gateway-client');
    const authHeader = req.headers.get('authorization') || '';
    const incomingToken = authHeader.replace(/^Bearer\s+/i, '').trim() || req.headers.get('x-clinic-token') || '';
    const gatewayResp = await forwardHeartbeatToGateway(
      { ...parsed.data, scriptVersion: parsed.data.scriptVersion || scriptVersion },
      incomingToken
    );

    if (gatewayResp && gatewayResp.success) {
      return NextResponse.json({
        ...gatewayResp,
        pendingAction: gatewayResp.pendingAction || result.pendingAction || null,
        inFlightStudies: result.inFlightStudies || [],
        scriptVersion,
      });
    }

    const targetId = parsed.data.nodeId || 'clinic-pc-primary';
    const currentTelemetry = getClinicNodeStatus(targetId);

    return NextResponse.json({
      success: true,
      pendingAction: result.pendingAction,
      scriptVersion,
      inFlightStudies: result.inFlightStudies || [],
      peerNodes: (result as any).peerNodes || [],
      settings: {
        maxStorageSizeGb: currentTelemetry.disk?.maxStorageSizeGb,
        autoRetention: currentTelemetry.autoRetention,
        heartbeatIntervalMs: currentTelemetry.heartbeatIntervalMs,
        compression: currentTelemetry.compression,
        syncRules: currentTelemetry.syncRules,
        schedule: currentTelemetry.schedule,
        harvestSchedule: currentTelemetry.harvestSchedule,
        syncPaused: currentTelemetry.syncPaused,
        stallWatchdog: currentTelemetry.stallWatchdog,
        peerCooperation: currentTelemetry.peerCooperation,
        knownNetworks: currentTelemetry.knownNetworks || [],
      },
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
