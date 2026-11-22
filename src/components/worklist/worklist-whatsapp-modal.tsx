'use client';

// Layer 4 (Presentation): WhatsApp Clinical Handover Modal with Class Date & Persistent Preferences
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Copy, Check, ExternalLink, Send, RefreshCw, Sparkles, RotateCcw } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { ConsultantPicker } from '@/components/ui/consultant-picker';
import { notify } from '@/services/notification.service';
import {
  formatWhatsappHandover,
  getWhatsappShareUrl,
  HandoverFieldsConfig,
  DEFAULT_HANDOVER_FIELDS,
  SIMPLE_HANDOVER_FIELDS,
} from '@/lib/whatsapp-handover';
import {
  loadSavedHandoverFields,
  saveHandoverFields,
  loadSavedClassDate,
  saveClassDate,
  loadSavedPhone,
  savePhone,
} from '@/lib/whatsapp-handover-storage';
import { WhatsappHandoverDropdown } from './whatsapp-handover-dropdown';
import { WhatsappClassDatePicker } from './whatsapp-class-date-picker';
import { useWhatsappSyncedCases } from '@/hooks/use-whatsapp-synced-cases';
import type { PacsStudyResult } from '@/types/pacs';
import { cn } from '@/lib/utils';

interface WorklistWhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCases: PacsStudyResult[];
  currentUserName?: string;
}

export function WorklistWhatsappModal({
  isOpen,
  onClose,
  selectedCases,
  currentUserName,
}: WorklistWhatsappModalProps) {
  const [seniorName, setSeniorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(loadSavedPhone);
  const [classDate, setClassDate] = useState<string>(loadSavedClassDate);
  const [customNote, setCustomNote] = useState('');
  const [fields, setFields] = useState<HandoverFieldsConfig>(loadSavedHandoverFields);
  const [copied, setCopied] = useState(false);

  const { syncedCases, isSyncing } = useWhatsappSyncedCases(isOpen, selectedCases);

  // Synchronize persisted preferences on modal open
  useEffect(() => {
    if (isOpen) {
      setFields(loadSavedHandoverFields());
      const savedPhone = loadSavedPhone();
      if (savedPhone && !phoneNumber) setPhoneNumber(savedPhone);
      const savedDate = loadSavedClassDate();
      if (savedDate) setClassDate(savedDate);
    }
  }, [isOpen]);

  const handleFieldsChange = (newFields: HandoverFieldsConfig) => {
    setFields(newFields);
    saveHandoverFields(newFields);
  };

  const handleClassDateChange = (newDate: string) => {
    setClassDate(newDate);
    saveClassDate(newDate);
  };

  const handlePhoneChange = (newPhone: string) => {
    setPhoneNumber(newPhone);
    savePhone(newPhone);
  };

  const isSimpleActive = useMemo(() => {
    return (Object.keys(SIMPLE_HANDOVER_FIELDS) as (keyof HandoverFieldsConfig)[]).every(
      (k) => fields[k] === SIMPLE_HANDOVER_FIELDS[k]
    );
  }, [fields]);

  const isFullActive = useMemo(() => {
    return (Object.keys(DEFAULT_HANDOVER_FIELDS) as (keyof HandoverFieldsConfig)[]).every(
      (k) => fields[k] === DEFAULT_HANDOVER_FIELDS[k]
    );
  }, [fields]);

  const formattedText = useMemo(() => {
    return formatWhatsappHandover(syncedCases, {
      doctorName: currentUserName || 'Dr. Muhammad Mudassir',
      seniorName: seniorName.trim() || undefined,
      customNote: customNote.trim() || undefined,
      classDate,
      ...fields,
    });
  }, [syncedCases, currentUserName, seniorName, customNote, classDate, fields]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = formattedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    notify.success('WhatsApp handover summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsapp = () => {
    const url = getWhatsappShareUrl(formattedText, phoneNumber.trim() || undefined);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const totalStudiesCount = useMemo(() => {
    return selectedCases.reduce((acc, c) => acc + (c.studies && c.studies.length > 0 ? c.studies.length : 1), 0);
  }, [selectedCases]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <ModalTitle>WhatsApp Clinical Handover</ModalTitle>
          <ModalDescription className="flex items-center gap-2">
            <span>
              Share {selectedCases.length} case{selectedCases.length === 1 ? '' : 's'}
              {totalStudiesCount !== selectedCases.length ? ` (${totalStudiesCount} studies)` : ''} with MR Numbers & details
            </span>
            {isSyncing ? (
              <span className="text-[10px] text-primary flex items-center gap-1 font-medium animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing live status...
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">● Live Synced</span>
            )}
          </ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-3.5">
        {/* Form Inputs: Consultant, Class Date, Phone, Note */}
        <div className="space-y-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-secondary mb-1 block">
                Senior Consultant (Optional)
              </label>
              <ConsultantPicker
                value={seniorName}
                onChange={setSeniorName}
                placeholder="Select or type Senior Consultant..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary mb-1 block flex items-center justify-between">
                <span>Class / Session Date</span>
                <span className="text-[10px] text-primary font-normal">Calendar</span>
              </label>
              <WhatsappClassDatePicker
                value={classDate}
                onChange={handleClassDateChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-secondary mb-1 block">
                WhatsApp Number (Optional)
              </label>
              <Input
                placeholder="e.g. 03001234567 or +92..."
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="text-xs h-8 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary mb-1 block">
                Clinical Note / Instructions (Optional)
              </label>
              <Input
                placeholder="e.g. Please verify urgent stroke case"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Fields Dropdown & Fast Presets */}
          <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
            <WhatsappHandoverDropdown fields={fields} onChange={handleFieldsChange} />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleFieldsChange(SIMPLE_HANDOVER_FIELDS)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all shadow-2xs select-none',
                  isSimpleActive
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-secondary'
                )}
                title="Minimal: Consultant, Date, Resident, Patient Name, Accession, Status only"
              >
                <Sparkles className="w-3 h-3" />
                <span>Simple</span>
              </button>
              <button
                type="button"
                onClick={() => handleFieldsChange(DEFAULT_HANDOVER_FIELDS)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all shadow-2xs select-none',
                  isFullActive
                    ? 'border-primary bg-primary/15 text-primary font-bold'
                    : 'border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-secondary'
                )}
                title="Full handover with all metadata, highlights, and departments"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Full</span>
              </button>
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between text-[11px] text-secondary font-medium">
            <div className="flex items-center gap-2">
              <span>Message Preview</span>
              {isSimpleActive && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Simple Mode
                </span>
              )}
            </div>
            <span className="font-mono">{formattedText.length} chars</span>
          </div>
          <div className="max-h-[170px] overflow-y-auto p-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text text-on-surface-variant">
            {formattedText}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 cursor-pointer text-xs mr-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="cursor-pointer text-xs"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSendWhatsapp}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs shadow-emerald-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{phoneNumber.trim() ? 'Send to WhatsApp' : 'Open WhatsApp Share'}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Button>
      </ModalFooter>
    </Modal>
  );
}
