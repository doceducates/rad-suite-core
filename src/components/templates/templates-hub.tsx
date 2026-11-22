'use client';

// Layer 4 (Presentation): Departmental Templates Hub & Category Organizer
// Invariant: Target < 250 lines, max 350 lines.

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrossSectionalTemplate } from '@/types/templates';
import { CategorySummary } from '@/services/templates-db.service';
import { TemplatesHubClusters } from './templates-hub-clusters';
import { AddCategoryModal } from './add-category-modal';
import { TemplateCard } from './template-card';
import { TemplatePreviewModal } from './template-preview-modal';
import { TemplateEditorModal } from './template-editor-modal';
import { ReportingStylePicker } from './reporting-style-picker';
import { WorklistManualCaseModal } from '@/components/worklist/worklist-manual-case-modal';
import { isContrastStudy } from '@/services/template-manager.service';
import { notify } from '@/services/notification.service';
import { useReportingPreferences } from '@/services/reporting-preferences.service';
import {
  stripOrIntegrateHeading,
  formatImpressionForStyle,
} from '@/services/template-style-engine.service';

export function TemplatesHub() {
  const [templates, setTemplates] = useState<CrossSectionalTemplate[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('CT');
  const [searchQuery, setSearchQuery] = useState('');
  const [contrastFilter, setContrastFilter] = useState<'ALL' | 'CONTRAST' | 'PLAIN'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [previewTemplate, setPreviewTemplate] = useState<CrossSectionalTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CrossSectionalTemplate | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isManualCaseModalOpen, setIsManualCaseModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { findingsStyle, impressionStyle } = useReportingPreferences();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        setCategories(data.categories);
      }
    } catch {
      notify.error('Failed to load departmental templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleUseTemplate = (tpl: CrossSectionalTemplate) => {
    try {
      const styledTemplate: CrossSectionalTemplate = {
        ...tpl,
        normalFindings: tpl.normalFindings?.map((f) =>
          findingsStyle === 'without_headings' ? stripOrIntegrateHeading(f) : f
        ) || [],
        defaultImpression: formatImpressionForStyle(tpl.defaultImpression, impressionStyle),
      };
      localStorage.setItem('radsuite_selected_template', JSON.stringify(styledTemplate));
    } catch {}
    setIsManualCaseModalOpen(true);
  };

  const handleCopyFindings = (tpl: CrossSectionalTemplate) => {
    const findingsList = tpl.normalFindings?.map((f) =>
      findingsStyle === 'without_headings' ? stripOrIntegrateHeading(f) : f
    ) || [];
    const text = findingsList.map((f) => `• ${f}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedId(tpl.id);
    notify.success(`Copied findings (${findingsStyle === 'without_headings' ? 'Without Headings' : 'With Headings'})`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteTemplate = async (tpl: CrossSectionalTemplate) => {
    if (!confirm(`Are you sure you want to delete "${tpl.name}"?`)) return;
    try {
      const res = await fetch(`/api/templates/${tpl.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      notify.success('Template deleted successfully');
      fetchTemplates();
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete template');
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        activeCategory === 'ALL' ||
        (tpl.modality || '').toUpperCase() === activeCategory.toUpperCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        (tpl.subspecialty && tpl.subspecialty.toLowerCase().includes(q)) ||
        (tpl.description && tpl.description.toLowerCase().includes(q)) ||
        (tpl.defaultImpression && tpl.defaultImpression.toLowerCase().includes(q));

      const isContrast = isContrastStudy(tpl.name + ' ' + tpl.description + ' ' + tpl.technique);
      const matchesContrast =
        contrastFilter === 'ALL' ||
        (contrastFilter === 'CONTRAST' && isContrast) ||
        (contrastFilter === 'PLAIN' && !isContrast);

      return matchesCategory && matchesSearch && matchesContrast;
    });
  }, [templates, activeCategory, searchQuery, contrastFilter]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="p-5 pb-4 border-b border-outline-variant/60 bg-surface-container-low shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-on-surface">Departmental Reporting Templates</h1>
          </div>
          <p className="text-xs text-secondary mt-1">
            Standardized normal templates following Lahore General Hospital 2-heading structure. Shared across all hospital radiologists.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <ReportingStylePicker compact />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            title="Refresh templates"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingTemplate(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <TemplatesHubClusters
          categories={categories}
          activeCategory={activeCategory}
          totalTemplatesCount={templates.length}
          onSelectCategory={(id) => setActiveCategory(id)}
          onOpenAddCategory={() => setIsAddCategoryOpen(true)}
        />

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeCategory === 'ALL' ? 'all' : activeCategory} templates (e.g. brain, stone, contrast)...`}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-secondary font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Contrast:
            </span>
            {(['ALL', 'PLAIN', 'CONTRAST'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setContrastFilter(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  contrastFilter === mode
                    ? 'bg-secondary-container text-on-secondary-container shadow-2xs'
                    : 'bg-surface-container text-secondary hover:text-on-surface'
                }`}
              >
                {mode === 'ALL' ? 'All' : mode === 'PLAIN' ? 'Plain' : 'Contrast'}
              </button>
            ))}
          </div>
        </div>

        {/* Active Category Header */}
        <div className="flex items-center justify-between text-xs text-secondary border-b border-outline-variant/40 pb-2">
          <span className="font-semibold text-on-surface">
            Showing {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} under {activeCategory === 'ALL' ? 'All Categories' : activeCategory}
          </span>
          <span className="text-[11px] font-mono text-secondary">
            Style: {findingsStyle === 'without_headings' ? 'Without Headings' : 'With Headings'} • {impressionStyle === 'local_high_yield' ? 'High-Yield' : 'ACR'}
          </span>
        </div>

        {/* Template Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-xs text-secondary font-mono">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-12 text-center text-secondary border border-dashed border-outline-variant/60 rounded-2xl p-8">
            <p className="text-sm font-semibold text-on-surface">No templates found</p>
            <p className="text-xs text-secondary mt-1">Try adjusting your search query or contrast filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={(tpl) => setPreviewTemplate(tpl)}
                onUse={handleUseTemplate}
                onEdit={(tpl) => {
                  setEditingTemplate(tpl);
                  setIsEditorOpen(true);
                }}
                onDelete={handleDeleteTemplate}
                copiedId={copiedId}
                onCopy={handleCopyFindings}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleUseTemplate}
        onEdit={(tpl) => {
          setEditingTemplate(tpl);
          setIsEditorOpen(true);
        }}
      />

      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingTemplate(null);
        }}
        onSaved={() => {
          fetchTemplates();
          notify.success('Template saved and available to all department users.');
        }}
        initialTemplate={editingTemplate}
        defaultCategory={activeCategory === 'ALL' ? 'CT' : activeCategory}
        availableCategories={categories.map((c) => c.name)}
      />

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onCategoryCreated={(name) => {
          setActiveCategory(name);
          setEditingTemplate(null);
          setIsEditorOpen(true);
          notify.success(`Category "${name}" created.`);
        }}
      />

      <WorklistManualCaseModal
        isOpen={isManualCaseModalOpen}
        onClose={() => setIsManualCaseModalOpen(false)}
      />
    </div>
  );
}
