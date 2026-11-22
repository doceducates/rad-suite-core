/**
 * Layer 2: Clinic Edge Node Auto-Registration & Handshake Service (<150 lines).
 * Handles zero-config discovery, unique hardware ID assignment, and cluster role provisioning.
 * AGENTS.md Rule 1: Under 250 lines. Rule 12: Silent Session 0 edge nodes. Rule 14: Anti-Choking.
 */

import {
  getNodesStore,
  writeRegistryDisk,
  DEFAULT_TELEMETRY,
  clearNodeDecommissioned,
} from './clinic-node-storage';
import type { ClinicNodeTelemetry } from './clinic-node.types';
import { logAudit } from './audit.service';

export interface ClinicHandshakePayload {
  hostname?: string;
  machineGuid?: string;
  macAddresses?: string[];
  lanIp?: string;
  platform?: string;
  scriptVersion?: string;
  requestedNodeId?: string;
}

export interface ClinicHandshakeResult {
  success: boolean;
  registered: boolean;
  nodeId: string;
  name: string;
  role: 'primary' | 'secondary_console';
  isPrimaryHarvester: boolean;
  partition: number;
  pacs: { host: string; port: number };
  s3: { endpoint: string; region: string; bucket: string };
  syncRules: any;
  harvestSchedule: any;
  heartbeatIntervalMs: number;
  clusterToken: string;
}

export async function handshakeClinicNode(payload: ClinicHandshakePayload): Promise<ClinicHandshakeResult> {
  const store = getNodesStore();
  const rawHost = (payload.hostname || 'clinic-pc').toUpperCase().trim();
  const cleanHost = rawHost.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32);

  // 1. Determine assigned nodeId
  let assignedNodeId = `node-${cleanHost}`;
  if (payload.requestedNodeId && payload.requestedNodeId !== 'auto' && payload.requestedNodeId !== 'clinic-pc-primary') {
    assignedNodeId = payload.requestedNodeId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  }

  // Check if assignedNodeId already exists in store
  const existing = store.get(assignedNodeId);
  if (existing) {
    const sameHost = !existing.hostname || existing.hostname.toUpperCase() === rawHost;
    if (!sameHost) {
      // Collision with a different machine: append incremental suffix
      let suffix = 2;
      while (store.has(`${assignedNodeId}-${suffix}`)) {
        suffix++;
      }
      assignedNodeId = `${assignedNodeId}-${suffix}`;
    }
  }

  clearNodeDecommissioned(assignedNodeId);

  // 2. Determine cluster role & harvest responsibility
  const otherNodes = Array.from(store.values()).filter((n) => n.nodeId !== assignedNodeId);
  const existingPrimary = otherNodes.find(
    (n) => n.lastHeartbeat !== null && Date.now() - new Date(n.lastHeartbeat).getTime() < 300000
  );

  const isPrimary = !existingPrimary;
  const role: 'primary' | 'secondary_console' = isPrimary ? 'primary' : 'secondary_console';
  const partition = isPrimary ? 0 : 1;

  // 3. Prepare telemetry record
  const current = store.get(assignedNodeId) || { ...DEFAULT_TELEMETRY, nodeId: assignedNodeId };
  const updated: ClinicNodeTelemetry = {
    ...current,
    nodeId: assignedNodeId,
    name: rawHost,
    hostname: rawHost,
    lanIp: payload.lanIp || current.lanIp || '',
    online: true,
    lastHeartbeat: new Date().toISOString(),
    scriptVersion: payload.scriptVersion || current.scriptVersion || '2.5.0',
    peerCooperation: { enabled: true, leaseTtlMinutes: 15 },
    syncRules: current.syncRules || {
      allowedModalities: ['MR'],
      descriptionKeywords: [
        'spine', 'cervical', 'dorsal', 'thoracic', 'lumbar', 'lumbosacral',
        'ls', 'lss', 'cs', 'css', 'ds', 'dss', 'dl'
      ],
      bypassKeywords: false,
      syncMode: 'auto_filtered',
    },
    harvestSchedule: {
      ...DEFAULT_TELEMETRY.harvestSchedule!,
      ...(current.harvestSchedule || {}),
      intervalMinutes: current.harvestSchedule?.intervalMinutes ?? DEFAULT_TELEMETRY.harvestSchedule?.intervalMinutes ?? 10,
      enabled: isPrimary,
      modalities: ['MR'],
      bypassKeywords: false,
    },
  };

  store.set(assignedNodeId, updated);
  writeRegistryDisk(store);

  try {
    await logAudit({
      userId: 'system-handshake',
      userName: 'Auto Registration',
      action: 'ADMIN_CLINIC_NODE_ACTION',
      entityType: 'ClinicNode',
      entityId: assignedNodeId,
      details: `Edge node ${assignedNodeId} (${rawHost}) completed automated handshake as ${role}`,
    });
  } catch {}

  const clusterToken = process.env.CLINIC_NODE_SECRET || 'clinic-secret-token';

  return {
    success: true,
    registered: true,
    nodeId: assignedNodeId,
    name: rawHost,
    role,
    isPrimaryHarvester: isPrimary,
    partition,
    pacs: {
      host: process.env.DEFAULT_PACS_HOST || '127.0.0.1',
      port: parseInt(process.env.DEFAULT_PACS_PORT || '8040', 10),
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'https://s3.example.com',
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'rad-suite',
    },
    syncRules: updated.syncRules,
    harvestSchedule: updated.harvestSchedule,
    heartbeatIntervalMs: 5000,
    clusterToken,
  };
}
