'use client';

import React, { useState, useEffect } from 'react';
import { BookmarkPlus, FileText, CheckCircle2 } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { addCustomTemplate } from '@/services/template-manager.service';
import { htmlToClinicalText, stripAttributionFromText } from '@/lib/clinical-format';
import { notify } from '@/services/notification.service';
import { CrossSectionalTemplate } from '@/types/templates';

const SUBSPECIALTIES: CrossSectionalTemplate['subspecialty'][] = [
  'Neuroradiology',
  'Abdominal',
  'Thoracic',
  'Musculoskeletal',
  'Head & Neck',
  'Vascular',
  'Pediatric',
];

interface ZenSaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  modality?: string;
  initialTechnique?: string;
  initialFindings?: string;
  initialImpression?: string;
  initialTitle?: string;
  onTemplateSaved?: (savedTemplate: CrossSectionalTemplate) => void;
}

export function ZenSaveTemplateModal({
  isOpen,
  onClose,
  modality = 'CT',
  initialTechnique = '',
  initialFindings = '',
  initialImpression = '',
  initialTitle = '',
  onTemplateSaved,
}: ZenSaveTemplateModalProps) {
  const [templateName, setTemplateName] = useState(initialTitle);
  const [templateModality, setTemplateModality] = useState<'CT' | 'MRI'>(
    modality?.toUpperCase() === 'MRI' || modality?.toUpperCase() === 'MR' ? 'MRI' : 'CT'
  );
  const [subspecialty, setSubspecialty] = useState<CrossSectionalTemplate['subspecialty']>('Neuroradiology');
  const [description, setDescription] = useState('');
  const [technique, setTechnique] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTemplateName(initialTitle || `${modality} Custom Protocol`);
      setTemplateModality(modality?.toUpperCase() === 'MRI' || modality?.toUpperCase() === 'MR' ? 'MRI' : 'CT');
      setTechnique(initialTechnique || '');
      setFindings(stripAttributionFromText(htmlToClinicalText(initialFindings)) || '');
      setImpression(stripAttributionFromText(htmlToClinicalText(initialImpression)) || '');
      setDescription('');
    }
  }, [isOpen, modality, initialTitle, initialTechnique, initialFindings, initialImpression]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!templateName.trim()) {
      notify.error('Please specify a template name.');
      return;
    }

    setSaving(true);
    try {
      // Split findings into bullet lines
      const normalFindings = findings
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const created = addCustomTemplate({
        name: templateName.trim(),
        modality: templateModality,
        subspecialty,
        description: description.trim() || `${templateModality} protocol for ${subspecialty}`,
        technique: technique.trim(),
        normalFindings: normalFindings.length > 0 ? normalFindings : ['No acute abnormal findings.'],
        defaultImpression: impression.trim() || 'No acute pathology identified.',
      });

      // Dispatch global refresh event so selectors update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('radsuite:template-saved', { detail: created }));
      }

      notify.success(`Template "${created.name}" saved! It is now available in your template selector.`);
      onTemplateSaved?.(created);
      onClose();
    } catch (err: any) {
      notify.error(`Failed to save template: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <BookmarkPlus className="w-4 h-4" />
        </div>
        <div>
          <ModalTitle>Save Report as Reusable Template</ModalTitle>
          <ModalDescription>
            Persist current findings & technique as a routine template for subsequent cases
          </ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-3">
        {/* Template Name & Modality */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-on-surface">
              Template Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. CT Brain Normal Routine or CT KUB Calculus"
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface text-on-surface text-xs font-medium focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-on-surface">Modality</label>
            <div className="flex rounded-lg border border-outline-variant/60 p-0.5 bg-surface-container">
              {(['CT', 'MRI'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTemplateModality(m)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    templateModality === m
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subspecialty & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-on-surface">Subspecialty Category</label>
            <select
              value={subspecialty}
              onChange={(e) => setSubspecialty(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface text-on-surface text-xs font-medium focus:outline-none focus:border-primary"
            >
              {SUBSPECIALTIES.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-on-surface">Clinical Indication / Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Standard routine contrast study for adult trauma"
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface text-on-surface text-xs font-medium focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Technique */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-on-surface">Technique Protocol</label>
          <input
            type="text"
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            placeholder="e.g. Helical axial CT sections acquired with contrast..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface text-on-surface text-xs font-mono focus:outline-none focus:border-primary"
          />
        </div>

        {/* Findings */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-on-surface flex items-center justify-between">
            <span>Structured Findings (One bullet per line)</span>
            <span className="text-[10px] text-secondary font-normal">Pre-filled from current report</span>
          </label>
          <textarea
            rows={5}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Document organ-by-organ normal or baseline findings..."
            className="w-full px-2.5 py-2 rounded-lg border border-outline-variant/60 bg-surface text-on-surface text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-y"
          />
        </div>

        {/* Impression */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-on-surface">Default Diagnostic Impression</label>
          <textarea
            rows={2}
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="e.g. 1. Normal CT study of the brain. No acute intracranial hemorrhage."
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface text-on-surface text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-y"
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 font-semibold">
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>Save Reusable Template</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
