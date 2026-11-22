'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Save,
  CloudUpload,
  RotateCcw,
  FileText,
  ExternalLink,
  UserCheck,
  Lock,
  Loader2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HmisDispatchOptionsModal } from '@/components/hmis/hmis-dispatch-options-modal';
import { HmisFinalSubmitModal } from '@/components/hmis/hmis-final-submit-modal';
import type { ReportStatus } from '@/types';

interface WorklistReportModalFooterProps {
  status: ReportStatus;
  setStatus: (status: ReportStatus) => void;
  hmisNotice: string | null;
  googleNotice: string | null;
  googleDocUrl: string | null;
  syncingGoogleDoc: boolean;
  revertingHmis: boolean;
  sendingHmis: boolean;
  saving: boolean;
  loading: boolean;
  isTakenUpByMe?: boolean;
  isClaimedByOther?: boolean;
  assignedDoctorName?: string | null;
  onClaimCase?: () => void;
  claimingCase?: boolean;
  onSyncGoogleDoc: () => void;
  onRevertHmis: () => void;
  onSendToHmis: (options?: { deepVerify?: boolean; dispatchCompanions?: boolean }) => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  isFinalSubmitAllowed?: boolean;
  onSubmitFinalToHmis?: (options?: { deepVerify?: boolean }) => Promise<void> | void;
  submittingHmis?: boolean;
  patientName?: string;
  patientMrn?: string;
  accessionNumber?: string;
  studyDescription?: string;
  companionStudies?: any[];
}

export function WorklistReportModalFooter({
  status,
  setStatus,
  hmisNotice,
  googleNotice,
  googleDocUrl,
  syncingGoogleDoc,
  revertingHmis,
  sendingHmis,
  saving,
  loading,
  isTakenUpByMe = false,
  isClaimedByOther = false,
  assignedDoctorName,
  onClaimCase,
  claimingCase = false,
  onSyncGoogleDoc,
  onRevertHmis,
  onSendToHmis,
  onSaveDraft,
  onFinalize,
  isFinalSubmitAllowed = false,
  onSubmitFinalToHmis,
  submittingHmis = false,
  patientName,
  patientMrn,
  accessionNumber,
  studyDescription,
  companionStudies = [],
}: WorklistReportModalFooterProps) {
  const [isHmisOptionsOpen, setIsHmisOptionsOpen] = useState(false);
  const [isFinalSubmitModalOpen, setIsFinalSubmitModalOpen] = useState(false);

  return (
    <div className="px-5 py-3 border-t border-outline-variant/60 bg-surface-container flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-secondary font-medium">Status:</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus)}
          className="px-2 py-1 rounded-md border border-outline-variant bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none cursor-pointer"
        >
          <option value="draft">Draft</option>
          <option value="preliminary">Preliminary / In Review</option>
          <option value="submitted">Submitted for Review</option>
          <option value="final">Finalized / Signed</option>
          <option value="amended">Amended</option>
        </select>
        {hmisNotice && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
            {hmisNotice}
          </span>
        )}
        {googleNotice && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            {googleNotice}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {googleDocUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(googleDocUrl, '_blank')}
            title="Open in Google Docs"
            className="gap-1 text-xs text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Docs</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncingGoogleDoc || loading}
          onClick={onSyncGoogleDoc}
          title={googleDocUrl ? 'Update document in Google Drive' : 'Sync report to Google Docs'}
          className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20"
        >
          <FileText className={`w-3.5 h-3.5 ${syncingGoogleDoc ? 'animate-bounce' : ''}`} />
          <span>{syncingGoogleDoc ? 'Syncing...' : googleDocUrl ? 'Update Doc' : 'Google Doc'}</span>
        </Button>

        {/* HMIS Actions strictly gated to taken-up cases */}
        {isTakenUpByMe ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={revertingHmis || loading}
              onClick={onRevertHmis}
              title="Revert draft back to default normal template on HMIS portal"
              className="gap-1.5 text-xs text-secondary hover:text-amber-500 border-outline-variant/80"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${revertingHmis ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{revertingHmis ? 'Reverting...' : 'Revert HMIS'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sendingHmis || loading}
              onClick={() => setIsHmisOptionsOpen(true)}
              title="Sync draft directly to Punjab HMIS Portal"
              className="gap-1.5 text-xs text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${sendingHmis ? 'animate-bounce' : ''}`} />
              <span>{sendingHmis ? 'Syncing...' : 'HMIS Draft'}</span>
            </Button>
          </>
        ) : isClaimedByOther ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-secondary bg-surface-container-high border border-outline-variant/60"
            title={`Claimed by ${assignedDoctorName || 'another doctor'}`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-medium truncate max-w-[150px]">
              {assignedDoctorName ? `Claimed: ${assignedDoctorName}` : 'Claimed by other'}
            </span>
          </div>
        ) : onClaimCase ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={claimingCase || loading}
            onClick={onClaimCase}
            title="Take up case to unlock reporting and HMIS draft sync"
            className="gap-1.5 text-xs font-semibold text-primary border-primary/40 bg-primary/10 hover:bg-primary/20"
          >
            {claimingCase ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            <span>{claimingCase ? 'Claiming...' : 'Take Up Case'}</span>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving || loading}
          onClick={onSaveDraft}
          className="gap-1.5 text-xs border-outline-variant/80"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Save Draft'}</span>
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={saving || loading}
          onClick={onFinalize}
          className="gap-1.5 text-xs bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Finalize & Sign</span>
        </Button>

        {/* Guarded Final Submission Button (Only when enabled & case is claimed by current user) */}
        {onSubmitFinalToHmis && isTakenUpByMe && isFinalSubmitAllowed && (
          <Button
            type="button"
            size="sm"
            disabled={submittingHmis || loading}
            onClick={() => setIsFinalSubmitModalOpen(true)}
            title="Submit permanently to Punjab HMIS Portal"
            className="gap-1.5 text-xs bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs"
          >
            {submittingHmis ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{submittingHmis ? 'Submitting...' : 'HMIS Submit'}</span>
          </Button>
        )}
      </div>

      <HmisDispatchOptionsModal
        isOpen={isHmisOptionsOpen}
        onClose={() => setIsHmisOptionsOpen(false)}
        caseCount={companionStudies.length > 0 ? companionStudies.length + 1 : 1}
        companionStudies={companionStudies}
        onConfirm={(opts) => {
          setIsHmisOptionsOpen(false);
          onSendToHmis(opts);
        }}
      />

      <HmisFinalSubmitModal
        isOpen={isFinalSubmitModalOpen}
        onClose={() => setIsFinalSubmitModalOpen(false)}
        patientName={patientName}
        patientMrn={patientMrn}
        accessionNumber={accessionNumber}
        studyDescription={studyDescription}
        onConfirm={async (opts) => {
          setIsFinalSubmitModalOpen(false);
          await onSubmitFinalToHmis?.(opts);
        }}
        submitting={submittingHmis}
      />
    </div>
  );
}
