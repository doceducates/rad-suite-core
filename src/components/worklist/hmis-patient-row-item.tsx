'use client';

// Layer 4 (Presentation): Dedicated HMIS Patient Encounter Row (<200 lines)
import React from 'react';
import { useRouter } from 'next/navigation';
import { formatDicomDateTime, getModalityColor } from '@/lib/utils';
import { CopyButton } from '@/components/ui/copy-button';
import { Building } from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';
import { HmisPatientStatusCell } from './hmis-patient-status-cell';
import { HmisPatientActionsCell } from './hmis-patient-actions-cell';
import { HmisStudyInvestigationCell } from './hmis-study-investigation-cell';
import { isSameRadiologistUser } from '@/services/unified-case-filters';

interface HmisPatientRowItemProps {
  study: PacsStudyResult;
  isSelected: boolean;
  onToggleSelect: (acc: string) => void;
  onClaimCase: (acc: string) => Promise<boolean>;
  onReleaseCase: (acc: string) => Promise<boolean>;
  onOpenReportModal: (st: PacsStudyResult) => void;
  onRequestClaimModal: (st: PacsStudyResult) => void;
  onTrackCase: (acc: string) => Promise<void>;
  trackingCase?: boolean;
  currentUserId?: string | null;
  onDeleteCase?: (st: PacsStudyResult) => void;
  onShareCase?: (st: PacsStudyResult) => void;
}

export function HmisPatientRowItem({
  study,
  isSelected,
  onToggleSelect,
  onClaimCase,
  onReleaseCase,
  onOpenReportModal,
  onRequestClaimModal,
  onTrackCase,
  trackingCase,
  currentUserId,
  onDeleteCase,
  onShareCase,
}: HmisPatientRowItemProps) {
  const router = useRouter();

  const isClaimedByMe = isSameRadiologistUser(study.assignedRadiologistId, currentUserId);
  const isClaimedByOther = Boolean(study.assignedRadiologistId && !isClaimedByMe);

  const isFinalOrPublished =
    study.status === 'final' ||
    study.status === 'finalized' ||
    study.status === 'reported' ||
    study.hmisStatus === 'completed';

  const hasDraft = Boolean(
    study.hasFindings ||
    study.status === 'draft' ||
    study.status === 'preliminary' ||
    study.reportId
  );

  const handleResultButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClaimedByMe) {
      onOpenReportModal(study);
    } else {
      onRequestClaimModal(study);
    }
  };

  const handleRowClick = () => {
    router.push(`/workstation/${encodeURIComponent(study.accessionNumber)}`);
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`hover:bg-surface-container/60 transition-colors group cursor-pointer text-xs border-b border-outline-variant/30 ${
        isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
      }`}
    >
      {/* 1. Selection Checkbox */}
      <td className="py-3 px-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={() => onToggleSelect(study.accessionNumber)}
          className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
          aria-label={`Select patient ${study.patientName}`}
        />
      </td>

      {/* 2. Order & Intake (Date/Time & Added By) */}
      <td className="py-3 px-3.5 min-w-[130px] whitespace-nowrap">
        <div className="font-mono text-on-surface text-[11px] font-medium">
          {formatDicomDateTime(study.studyDate, study.studyTime)}
        </div>
        {study.technologist ? (
          <div className="text-[10px] text-secondary/80 mt-0.5 truncate max-w-[140px]" title={`Added by: ${study.technologist}`}>
            Added: <span className="font-medium text-on-surface/80">{study.technologist}</span>
          </div>
        ) : (
          <div className="text-[10px] text-secondary/60 mt-0.5 font-mono">HMIS Intake</div>
        )}
      </td>

      {/* 3. Patient Demographics (Name, MRN, CNIC, Age/Gender) */}
      <td className="py-3 px-3.5 min-w-[170px] max-w-[220px]">
        <div className="font-bold text-on-surface text-[13px] truncate" title={study.patientName}>
          {study.patientName}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-secondary text-[10px]">
          <span>{study.age ? `${study.age}y` : ''}</span>
          <span>•</span>
          <span>{study.gender || 'Unknown'}</span>
          {study.patientPhone && (
            <>
              <span>•</span>
              <span className="font-mono">{study.patientPhone}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-secondary" onClick={(e) => e.stopPropagation()}>
          <span>MRN: <strong className="text-on-surface">{study.patientMrn}</strong></span>
          <CopyButton text={study.patientMrn} size="xs" title="Copy MRN" />
        </div>
        {study.cnic && (
          <div className="text-[10px] font-mono text-secondary/70 mt-0.5">
            CNIC: {study.cnic}
          </div>
        )}
      </td>

      {/* 4. Referring & Encounter (Doctor, Dept, Clinic) */}
      <td className="py-3 px-3.5 min-w-[160px] max-w-[210px]">
        {study.referringDoctor ? (
          <div className="font-medium text-on-surface text-[11px] truncate" title={study.referringDoctor}>
            {study.referringDoctor.replace(/^dr\.?\s*/i, 'Dr. ')}
          </div>
        ) : (
          <div className="text-secondary/60 text-[11px] italic">No Referring Doctor</div>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {study.department && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface border border-outline-variant/50">
              {study.department}
            </span>
          )}
          {study.room && (
            <span className="text-[10px] text-secondary flex items-center gap-1 truncate max-w-[130px]" title={study.room}>
              <Building className="w-2.5 h-2.5 opacity-60" />
              <span>{study.room}</span>
            </span>
          )}
        </div>
      </td>

      {/* 5. Investigation & Accession (Study, Modality, Acc#) */}
      <HmisStudyInvestigationCell study={study} />

      {/* 6. HMIS Status & Assignment State */}
      <HmisPatientStatusCell
        isFinalOrPublished={isFinalOrPublished}
        hasDraft={hasDraft}
        isClaimedByMe={isClaimedByMe}
        isClaimedByOther={isClaimedByOther}
        assignedRadiologistName={study.assignedRadiologistName}
        accessionNumber={study.accessionNumber}
        onReleaseCase={onReleaseCase}
      />

      {/* 7. Actions */}
      <HmisPatientActionsCell
        study={study}
        isClaimedByMe={isClaimedByMe}
        isFinalOrPublished={isFinalOrPublished}
        hasDraft={hasDraft}
        onResultClick={handleResultButtonClick}
        onClaimCase={onClaimCase}
        onTrackCase={onTrackCase}
        trackingCase={trackingCase}
        onDeleteCase={onDeleteCase}
        onShareCase={onShareCase}
      />
    </tr>
  );
}
