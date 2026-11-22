'use client';

import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CollabStatusBadge } from './collab-status-badge';
import { SmartDictationMic } from './smart-dictation-mic';
import {
  Save,
  CheckCircle2,
  Layers,
  GitCompare,
  Wand2,
  FileText,
  Send,
} from 'lucide-react';

interface ReportEditorHeaderProps {
  status: string;
  savedTime: string | null;
  structuring: boolean;
  saving: boolean;
  canStructure: boolean;
  onOpenMorningDiff: () => void;
  onOpenTemplateModal: () => void;
  onOpenOfficialReport: () => void;
  onDictatedText: (text: string, action?: string) => void;
  onStructure: () => void;
  onSave: (status?: string) => void;
  onSendToHmis?: () => void;
  sendingHmis?: boolean;
}

export function ReportEditorHeader({
  status,
  savedTime,
  structuring,
  saving,
  canStructure,
  onOpenMorningDiff,
  onOpenTemplateModal,
  onOpenOfficialReport,
  onDictatedText,
  onStructure,
  onSave,
  onSendToHmis,
  sendingHmis = false,
}: ReportEditorHeaderProps) {
  return (
    <CardHeader className="p-3 flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <CardTitle className="text-xs sm:text-sm">Structured Diagnostic Report</CardTitle>
        <Badge variant={status === 'final' ? 'success' : 'outline'} className="capitalize text-[10px]">
          {status}
        </Badge>
        <CollabStatusBadge />
        {savedTime && <span className="text-[10px] text-zinc-400 hidden sm:inline">Saved {savedTime}</span>}
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenOfficialReport}
          className="gap-1 text-xs px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          title="View Official Institutional Printable Report"
        >
          <FileText className="w-3.5 h-3.5" /> <span className="hidden md:inline">Hospital Report</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenMorningDiff}
          className="gap-1 text-xs px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          title="Morning Rounds PGR vs Consultant Diff"
        >
          <GitCompare className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Rounds Diff</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenTemplateModal}
          className="gap-1 text-xs px-2 py-1"
          title="Open HMIS Reporting Templates"
        >
          <Layers className="w-3.5 h-3.5 text-primary" /> Templates
        </Button>
        <SmartDictationMic onTranscript={onDictatedText} />
        <Button
          size="sm"
          variant="ghost"
          onClick={onStructure}
          isLoading={structuring}
          disabled={!canStructure}
          className="gap-1 text-xs px-2 py-1 text-primary hover:bg-primary/10"
          title="Auto-Structure findings & impression using MedGemma AI"
        >
          <Wand2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Auto-Structure</span>
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onSave()} isLoading={saving} className="gap-1 text-xs px-2 py-1">
          <Save className="w-3.5 h-3.5" /> Save
        </Button>
        {onSendToHmis && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSendToHmis}
            isLoading={sendingHmis}
            className="gap-1 text-xs px-2 py-1 text-primary hover:bg-primary/10 border-primary/30"
            title="Dispatch verified report to HMIS Punjab Chrome extension"
          >
            <Send className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Send to HMIS</span>
          </Button>
        )}
        {status !== 'final' && (
          <Button size="sm" variant="primary" onClick={() => onSave('final')} isLoading={saving} className="gap-1 text-xs px-2 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Finalize
          </Button>
        )}
      </div>
    </CardHeader>
  );
}
