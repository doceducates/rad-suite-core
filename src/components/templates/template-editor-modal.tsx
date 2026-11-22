'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrossSectionalTemplate } from '@/types/templates';
import { TipTapEditor } from '@/components/editor/tiptap-editor';
import { findingsListToHtml, clinicalTextToHtml } from '@/lib/clinical-format';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (template: CrossSectionalTemplate) => void;
  initialTemplate?: CrossSectionalTemplate | null;
  defaultCategory?: string;
  availableCategories?: string[];
}

export function TemplateEditorModal({
  isOpen,
  onClose,
  onSaved,
  initialTemplate,
  defaultCategory = 'CT',
  availableCategories = ['CT', 'MRI', 'USG', 'X-RAY'],
}: TemplateEditorModalProps) {
  const [name, setName] = useState('');
  const [modality, setModality] = useState(defaultCategory);
  const [subspecialty, setSubspecialty] = useState('');
  const [description, setDescription] = useState('');
  const [techniqueHtml, setTechniqueHtml] = useState('');
  const [findingsHtml, setFindingsHtml] = useState('');
  const [impressionHtml, setImpressionHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialTemplate?.name || '');
    setModality(initialTemplate?.modality || defaultCategory);
    setSubspecialty(initialTemplate?.subspecialty || 'General');
    setDescription(initialTemplate?.description || '');
    setTechniqueHtml(clinicalTextToHtml(initialTemplate?.technique || ''));
    setFindingsHtml(findingsListToHtml(initialTemplate?.normalFindings || []));
    setImpressionHtml(clinicalTextToHtml(initialTemplate?.defaultImpression || ''));
    setError('');
  }, [initialTemplate, defaultCategory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter a template title');
    if (!modality.trim()) return setError('Please select or enter a category');
    if (!techniqueHtml.trim() || techniqueHtml === '<p></p>') return setError('Please enter imaging technique');
    if (!findingsHtml.trim() || findingsHtml === '<p></p>') return setError('Please enter findings');
    if (!impressionHtml.trim() || impressionHtml === '<p></p>') return setError('Please enter clinical impression');

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        modality: modality.toUpperCase().trim(),
        subspecialty: subspecialty.trim() || 'General',
        description: description.trim(),
        technique: techniqueHtml,
        normalFindings: findingsHtml,
        defaultImpression: impressionHtml,
      };

      const isExistingCustom = Boolean(initialTemplate?.isCustom && initialTemplate?.id?.startsWith('custom-'));
      const url = isExistingCustom ? `/api/templates/${initialTemplate!.id}` : '/api/templates';
      const method = isExistingCustom ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save template');
      }

      onSaved(data.template || { ...payload, id: initialTemplate?.id || `tpl-${Date.now()}`, isCustom: true });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-3xl w-full bg-surface-container-low rounded-2xl border border-outline-variant/60 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 px-5 border-b border-outline-variant/40 flex items-center justify-between shrink-0 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {initialTemplate ? `Edit Template: ${initialTemplate.name}` : 'Create Departmental Template'}
              </h3>
              <p className="text-xs text-secondary">
                Authoring with TipTap rich text editor. Saved templates are shared across all radiologists.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Template Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CT Abdomen & Pelvis (Normal CECT) or USG KUB (Normal)"
                className="text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Category / Modality *
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-outline-variant/80 bg-surface-container text-on-surface text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Subspecialty / Anatomical Region
              </label>
              <Input
                value={subspecialty}
                onChange={(e) => setSubspecialty(e.target.value)}
                placeholder="e.g. Abdominal, Neuroradiology, MSK, Thoracic"
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Clinical Indication / Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Routine outpatient screening or emergency trauma protocol"
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Technique (TipTap Editor) *
            </label>
            <TipTapEditor
              content={techniqueHtml}
              onChange={setTechniqueHtml}
              placeholder="Imaging technique, sequences, and contrast parameters..."
              minHeight="70px"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-on-surface">
                Findings with Anatomical Headings (TipTap Editor) *
              </label>
              <span className="text-[11px] text-secondary">
                Use Bold for anatomical colon headings (e.g. <strong>Liver:</strong>)
              </span>
            </div>
            <TipTapEditor
              content={findingsHtml}
              onChange={setFindingsHtml}
              placeholder="Enter anatomical findings paragraphs with bold colon subheadings..."
              minHeight="160px"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Impression (TipTap Editor) *
            </label>
            <TipTapEditor
              content={impressionHtml}
              onChange={setImpressionHtml}
              placeholder="1. Normal examination.\n2. No focal abnormality identified."
              minHeight="80px"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving} className="flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save & Share with Department'}</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
