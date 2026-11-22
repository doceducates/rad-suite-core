'use client';

// Layer 4 (Presentation): Smart Patient Journey Tracer (<250 lines)
import React, { useState, useEffect } from 'react';
import {
  Check,
  Zap,
  AlertTriangle,
  Clock,
  FileDown,
  FileEdit,
  Phone,
  CreditCard,
  Loader2,
  X,
} from 'lucide-react';
import type { HmisPublishedReport } from '@/services/hmis/hmis-models';

interface WorklistPatientTracerProps {
  searchQuery: string;
  onOpenReportModal?: (study: any) => void;
  onSelectPrior?: (report: HmisPublishedReport) => void;
  onSyncHmis?: (opts?: any) => Promise<void>;
  syncingHmis?: boolean;
  variant?: 'standalone' | 'embedded' | 'row';
  colSpan?: number;
}

export function WorklistPatientTracer({
  searchQuery,
  onOpenReportModal,
  onSelectPrior,
  onSyncHmis,
  syncingHmis,
  variant = 'row',
  colSpan = 6,
}: WorklistPatientTracerProps) {
  const [tracing, setTracing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [traceData, setTraceData] = useState<{
    localStudy?: any | null;
    published?: HmisPublishedReport | null;
    allPublished?: HmisPublishedReport[];
    trackingRecord?: any | null;
    queryType: 'accession' | 'mrn' | 'query';
  } | null>(null);

  const cleanQuery = searchQuery?.trim() || '';
  const isLikelyIdentifier = /^\d{5,16}$/.test(cleanQuery);

  // Reset dismissed state whenever query changes
  useEffect(() => {
    setDismissed(false);
  }, [cleanQuery]);

  useEffect(() => {
    if (!isLikelyIdentifier) {
      setTraceData(null);
      return;
    }

    let active = true;
    setTracing(true);
    setTraceData(null);

    const isMrn = cleanQuery.length >= 13;
    const isAcc = !isMrn && /^\d{5,12}$/.test(cleanQuery);
    const queryType = isMrn ? 'mrn' : isAcc ? 'accession' : 'query';

    async function runSmartTrace() {
      try {
        // 1. Check Local Workstation Database
        let localStudy: any = null;
        try {
          const localRes = await fetch(`/api/cases/${encodeURIComponent(cleanQuery)}/details`);
          if (localRes.ok) {
            const localJson = await localRes.json();
            localStudy = localJson.data || null;
          }
        } catch {}

        // 2. Check Published Reports
        const pubParams = new URLSearchParams();
        if (queryType === 'accession') pubParams.set('accession', cleanQuery);
        else pubParams.set('mrn', cleanQuery);

        const pubRes = await fetch(`/api/hmis/published?${pubParams.toString()}`);
        const pubJson = await pubRes.json();
        const records: HmisPublishedReport[] = pubJson?.data?.records || [];
        const primaryPublished = records[0] || null;

        // 3. Check Tracking List (Tech Ack & Room Intake)
        const trackParams = new URLSearchParams();
        if (queryType === 'accession') trackParams.set('accession', cleanQuery);
        else trackParams.set('mrn', cleanQuery);

        const trackRes = await fetch(`/api/hmis/tracking-list?${trackParams.toString()}`);
        const trackJson = await trackRes.json();
        const trackingRecord = trackJson?.data?.records?.[0] || null;

        if (active) {
          setTraceData({
            localStudy,
            published: primaryPublished,
            allPublished: records,
            trackingRecord,
            queryType,
          });
        }
      } catch (err) {
        console.error('Smart trace error:', err);
      } finally {
        if (active) setTracing(false);
      }
    }

    runSmartTrace();
    return () => {
      active = false;
    };
  }, [cleanQuery, isLikelyIdentifier]);

  if (dismissed || !isLikelyIdentifier) return null;

  const isBusy = tracing || Boolean(syncingHmis);
  const local = traceData?.localStudy;
  const pub = traceData?.published;
  const track = traceData?.trackingRecord;
  const hasAnyData = Boolean(local || pub || track);

  const isPendingAck = track?.isPendingAcknowledgment ?? false;
  const isAcked = Boolean(local || pub || track?.isAcknowledged || track?.radiographer);
  const isPublished = Boolean(pub);

  const patientName = local?.patientName || pub?.patientName || track?.patientName || 'Patient Record';
  const mrn = local?.patientMrn || pub?.mrn || track?.mrn || cleanQuery;
  const accession = local?.accessionNumber || pub?.accession || track?.accession || cleanQuery;
  const phone = local?.phone || track?.contact || '';
  const cnic = pub?.cnic || track?.cnic || '';
  const doctor = local?.referringDoctor || pub?.doctor || track?.orderingDoctor || 'Ordered & Received';
  const department = local?.department || pub?.clinic || track?.department || 'Radiology Dept';
  const room = local?.room || track?.room || pub?.room || 'Scan Room';
  const studyTitle = local?.studyDescription || pub?.studyTitle || track?.testType || 'Diagnostic Scan';
  const technologist = local?.technologist || track?.radiographer || 'Acknowledged';

  const content = (
    <div className="p-2 sm:p-2.5 rounded-lg border border-primary/20 bg-surface-container-low/95 text-xs shadow-2xs font-sans">
      {/* 1. Searching Lightning State */}
      {isBusy && !hasAnyData ? (
        <div className="flex items-center justify-between py-1.5 px-2 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <Zap className="w-3.5 h-3.5 fill-amber-500 animate-pulse text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-on-surface text-xs">Searching Patient Journey</span>
                <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono text-[11px] font-bold">{cleanQuery}</span>
              </div>
              <p className="text-[10px] text-secondary">
                Scanning local database index & querying HMIS clinical portal across all milestones...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-500 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Searching...</span>
            </span>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 text-secondary hover:text-on-surface cursor-pointer rounded"
              title="Dismiss tracer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : hasAnyData ? (
        <div className="space-y-2">
          {/* 2. Patient Demographics & Close Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 pb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
              <span className="font-bold text-xs text-on-surface">{patientName}</span>
              <span className="text-secondary font-mono text-[11px]">MRN: {mrn}</span>
              {accession && <span className="text-secondary font-mono text-[11px]">Acc: {accession}</span>}
              {isBusy && <Loader2 className="w-3 h-3 animate-spin text-primary ml-1" />}
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-secondary">
              {phone && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  <Phone className="w-3 h-3" /> {phone}
                </span>
              )}
              {cnic && (
                <span className="hidden md:flex items-center gap-1 font-mono">
                  <CreditCard className="w-3 h-3" /> CNIC: {cnic}
                </span>
              )}
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="p-1 text-secondary hover:text-on-surface cursor-pointer rounded ml-1"
                title="Dismiss tracer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. 4-Step Animated Pipeline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-0.5">
            {/* Step 1: Order Intake */}
            <div className="flex items-start gap-2 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/40">
              <div className="mt-0.5 rounded-full p-0.5 bg-emerald-500/10 text-emerald-500 transition-all duration-300 animate-in zoom-in-75">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs text-on-surface block">1. Order Intake</span>
                <span className="text-[10px] text-secondary block truncate" title={doctor}>
                  {doctor}
                </span>
                <span className="text-[10px] text-secondary/80 block truncate">{department}</span>
              </div>
            </div>

            {/* Step 2: Tech Ack */}
            <div className="flex items-start gap-2 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/40">
              <div className="mt-0.5 rounded-full p-0.5 transition-all duration-300 animate-in zoom-in-75">
                {isPendingAck ? (
                  <span className="text-amber-500 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /></span>
                ) : isAcked ? (
                  <span className="text-emerald-500 bg-emerald-500/10 rounded-full block p-0.5"><Check className="w-3.5 h-3.5 stroke-[2.5]" /></span>
                ) : (
                  <span className="text-secondary"><Clock className="w-3.5 h-3.5" /></span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs text-on-surface block">2. Tech Ack</span>
                <span className={`text-[10px] block truncate font-medium ${isPendingAck ? 'text-amber-500' : isAcked ? 'text-emerald-600 dark:text-emerald-400' : 'text-secondary'}`}>
                  {isPendingAck ? '⚠️ Awaiting Ack' : isAcked ? 'Acknowledged' : 'Pending Ack'}
                </span>
                <span className="text-[10px] text-secondary/80 block truncate">
                  {room} {technologist && technologist !== 'Acknowledged' ? `· ${technologist}` : ''}
                </span>
              </div>
            </div>

            {/* Step 3: Reporting */}
            <div className="flex items-start gap-2 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/40">
              <div className="mt-0.5 rounded-full p-0.5 transition-all duration-300 animate-in zoom-in-75">
                {isPublished || local?.status === 'draft' || local?.status === 'final' || local?.status === 'preliminary' ? (
                  <span className="text-emerald-500 bg-emerald-500/10 rounded-full block p-0.5"><Check className="w-3.5 h-3.5 stroke-[2.5]" /></span>
                ) : (
                  <span className="text-primary"><FileEdit className="w-3.5 h-3.5" /></span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs text-on-surface block">3. Reporting</span>
                <span className="text-[10px] text-secondary block truncate font-medium">
                  {isPublished ? 'Report Completed' : local?.status === 'draft' ? 'Draft Saved' : local?.status === 'final' ? 'Finalized' : 'Ready for Reporting'}
                </span>
                <span className="text-[10px] text-secondary/80 block truncate" title={studyTitle}>{studyTitle}</span>
              </div>
            </div>

            {/* Step 4: Published */}
            <div className="flex items-start gap-2 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/40">
              <div className="mt-0.5 rounded-full p-0.5 transition-all duration-300 animate-in zoom-in-75">
                {isPublished ? (
                  <span className="text-emerald-500 bg-emerald-500/10 rounded-full block p-0.5"><Check className="w-3.5 h-3.5 stroke-[2.5]" /></span>
                ) : (
                  <span className="text-secondary"><Clock className="w-3.5 h-3.5" /></span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs text-on-surface block">4. Published</span>
                <span className={`text-[10px] block truncate font-medium ${isPublished ? 'text-emerald-600 dark:text-emerald-400' : 'text-secondary'}`}>
                  {isPublished ? `Dr: ${pub?.doctor || 'Verified'}` : 'Not Published'}
                </span>
                {pub?.pdfEncodedId ? (
                  <button
                    type="button"
                    onClick={() => window.open(`/api/hmis/published/pdf/${encodeURIComponent(pub.pdfEncodedId!)}`, '_blank')}
                    className="mt-0.5 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                  >
                    <FileDown className="w-2.5 h-2.5" />
                    <span>Official PDF</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-secondary/70 block">Official archive</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (variant === 'row') {
    return (
      <tr className="bg-surface-container-low/70 border-b border-primary/20 transition-all">
        <td colSpan={colSpan} className="p-2 sm:p-2.5">
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
