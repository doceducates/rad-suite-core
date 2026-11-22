'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Keyboard,
  Layers,
  Sparkles,
  Shield,
  Cloud,
  FileText,
  X,
  Play,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface WorkstationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkstationGuideModal({ isOpen, onClose }: WorkstationGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'workflow' | 'pacs'>('shortcuts');

  // Keyboard shortcut: Shift + ? opens the guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          window.dispatchEvent(new CustomEvent('open-workstation-guide'));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnBackdropClick={true}>
      <div className="relative p-5 sm:p-6 flex flex-col gap-4 text-foreground select-none max-h-[85vh] overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 pr-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-headline leading-tight text-on-surface">
                Workstation Functions &amp; Shortcuts Guide
              </h2>
              <p className="text-[11px] text-secondary">
                Master rapid single-handed reporting and clinical imaging features
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] hidden sm:inline-flex">
            Press Shift + ?
          </Badge>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'bg-surface text-on-surface font-semibold shadow-xs border border-border'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Hotkeys &amp; Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              activeTab === 'workflow'
                ? 'bg-surface text-on-surface font-semibold shadow-xs border border-border'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Clinical Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pacs')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              activeTab === 'pacs'
                ? 'bg-surface text-on-surface font-semibold shadow-xs border border-border'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            PACS &amp; Cloud Drive
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-secondary leading-relaxed">
          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <div>
                <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono mb-1.5">
                  CT Hounsfield Unit (HU) Presets
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Key 1: Brain Plain (80 / 40)</span>
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-background border border-border text-primary">1</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Key 2: Bone Window (2000 / 500)</span>
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-background border border-border text-primary">2</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Key 3: Subdural Window (130 / 70)</span>
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-background border border-border text-primary">3</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Key 4: Soft Tissue (350 / 50)</span>
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-background border border-border text-primary">4</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono mb-1.5">
                  Diagnostic Scrubbing &amp; Tools
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Mouse Wheel / Up-Down</span>
                    <span className="font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border">Scrub Slices</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Toggle CINE Loop Playback</span>
                    <span className="font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border">Key C</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Invert Grayscale LUT</span>
                    <span className="font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border">Key I</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Reset Viewport &amp; Zoom</span>
                    <span className="font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border">Key R</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Toggle Sidebar Collapse</span>
                    <span className="font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border">[ or Ctrl+B</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container border border-border flex items-center justify-between">
                    <span>Manual Vault Snapshot</span>
                    <span className="font-mono font-semibold bg-background px-1.5 py-0.5 rounded border border-border">Ctrl + S</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-container border border-border flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-on-surface text-xs">Tamper-Proof Local Draft Vault</h5>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Every keystroke, impression change, and finding is continuously written to the local SQLite WAL database. If your browser or power cuts out, your report is 100% recovered on reopen.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-border flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-on-surface text-xs">Punjab HMIS Draft Sync</h5>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Clicking <strong>Save to HMIS</strong> syncs your draft into Punjab HMIS without committing. Invariant: Final submit is hard-locked to prevent premature commits.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-border flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-on-surface text-xs">AI Diagnostic Copilot &amp; DDx</h5>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Use the AI tab in the workstation companion panel for guideline criteria (Fleischner, Bosniak, LI-RADS) and differential diagnosis formatting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pacs' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-container border border-border flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-on-surface text-xs">Drag &amp; Drop DICOM Ingestion</h5>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Drag any DICOM study folder or <code>.zip</code> archive directly onto the workstation screen. Slices are automatically grouped by series with zero configuration.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container border border-border flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-on-surface text-xs">Personal 15 GB Google Drive Archival</h5>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Connect your free Google account in Settings. With 1 click, archive any study ZIP directly into your private Google Drive under <code>Rad Suite Cases/YYYY/MM/MODALITY/</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('open-setup-wizard'));
            }}
            className="text-xs h-8 gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open Setup Wizard</span>
          </Button>

          <Button type="button" variant="primary" size="sm" onClick={onClose} className="text-xs h-8 px-4">
            Close Guide
          </Button>
        </div>
      </div>
    </Modal>
  );
}
