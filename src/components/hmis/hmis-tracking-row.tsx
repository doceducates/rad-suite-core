'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Phone, User, Copy } from 'lucide-react';
import type { HmisTrackingRecord } from '@/services/hmis/hmis-models';

interface HmisTrackingRowProps {
  record: HmisTrackingRecord;
  onTrackAccession?: (accession: string, mrn?: string) => void;
  onStageStudy?: (record: any) => void;
  copyToClipboard: (text: string, label: string) => void;
}

export function HmisTrackingRow({
  record: r,
  onTrackAccession,
  onStageStudy,
  copyToClipboard,
}: HmisTrackingRowProps) {
  const isUnack =
    r.isPendingAcknowledgment ||
    r.status === 'PENDING_ACKNOWLEDGMENT' ||
    (!r.isAcknowledged && !r.isPerformed);

  return (
    <tr key={`${r.id}-${r.accession || r.mrn}`} className="hover:bg-surface-container-high/30 transition-colors">
      {/* Patient Bio */}
      <td className="py-2.5 px-3">
        <div className="font-semibold text-foreground">{r.patientName}</div>
        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
          <span>MRN: {r.mrn}</span>
          {r.cnic && <span>• CNIC: {r.cnic}</span>}
        </div>
        {r.contact && (
          <div className="flex items-center gap-1 text-[11px] text-primary mt-0.5">
            <Phone className="w-3 h-3 shrink-0" />
            <button
              type="button"
              onClick={() => copyToClipboard(r.contact!, 'Phone')}
              className="hover:underline flex items-center gap-1 font-mono cursor-pointer"
              title="Click to copy phone number"
            >
              {r.contact}
              <Copy className="w-2.5 h-2.5 opacity-60" />
            </button>
          </div>
        )}
      </td>

      {/* Study */}
      <td className="py-2.5 px-3">
        <div className="font-medium text-foreground">{r.cpt || 'Radiology Investigation'}</div>
        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
          Acc: {r.accession || 'Pending'}
        </div>
        {r.priority && (
          <Badge
            variant="outline"
            className={`text-[9px] py-0 px-1 mt-1 ${
              r.priority === 'urgent'
                ? 'border-rose-500/40 text-rose-400'
                : 'border-outline-variant/40 text-muted-foreground'
            }`}
          >
            {r.priority.toUpperCase()}
          </Badge>
        )}
      </td>

      {/* Radiographer Acknowledgment Status */}
      <td className="py-2.5 px-3">
        {isUnack ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-[11px]">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Pending Ack</span>
          </div>
        ) : r.isPerformed ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium text-[11px]">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Performed</span>
          </div>
        ) : r.isAcknowledged ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium text-[11px]">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Acknowledged</span>
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {r.status}
          </Badge>
        )}

        {(r.radiographer || r.acknowledgmentActor) && (
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <User className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate max-w-[140px]">{r.radiographer || r.acknowledgmentActor}</span>
          </div>
        )}
        {r.acknowledgmentTimestamp && (
          <div className="text-[9px] text-muted-foreground/70">{r.acknowledgmentTimestamp}</div>
        )}
      </td>

      {/* Room / Dept */}
      <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground/90">{r.room || 'Room Unassigned'}</div>
        <div>{r.department || r.section || 'Radiology'}</div>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onTrackAccession?.(r.accession, r.mrn)}
            className="h-7 text-[11px] px-2 text-primary hover:bg-primary/10"
            title="View 9-Stage Visual Timeline"
          >
            Milestones
          </Button>
          {r.isPerformed && onStageStudy && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStageStudy(r)}
              className="h-7 text-[11px] px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              Compose
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
