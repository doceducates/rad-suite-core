'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Plus, Trash2, Sparkles, Search, Layers, Zap } from 'lucide-react';
import type { VocabularyTerm } from '@/services/clinical-vocabulary.service';
import { notify } from '@/services/notification.service';

interface VoiceLabVocabularyManagerProps {
  terms: VocabularyTerm[];
  onAddTerm: (term: { term: string; category: any; modality: any; phoneticHint?: string }) => Promise<void>;
  onDeleteTerm: (id: string) => Promise<void>;
  onAutoDetect: (text: string) => Promise<void>;
  isProcessing: boolean;
}

export function VoiceLabVocabularyManager({
  terms,
  onAddTerm,
  onDeleteTerm,
  onAutoDetect,
  isProcessing,
}: VoiceLabVocabularyManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModality, setSelectedModality] = useState('all');

  // Form states
  const [newTerm, setNewTerm] = useState('');
  const [newCategory, setNewCategory] = useState<VocabularyTerm['category']>('general');
  const [newModality, setNewModality] = useState<VocabularyTerm['modality']>('ALL');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Auto-detect text state
  const [detectText, setDetectText] = useState('');
  const [showDetector, setShowDetector] = useState(false);

  const filtered = terms.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedModality !== 'all' && t.modality !== 'ALL' && t.modality !== selectedModality) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.term.toLowerCase().includes(q) || t.phoneticHint?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim()) return;
    await onAddTerm({
      term: newTerm.trim(),
      category: newCategory,
      modality: newModality,
      phoneticHint: newPhonetic.trim() || undefined,
    });
    setNewTerm('');
    setNewPhonetic('');
    setIsAdding(false);
  };

  const handleRunDetect = async () => {
    if (!detectText.trim()) return;
    await onAutoDetect(detectText.trim());
    setDetectText('');
    setShowDetector(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medical terms or phonetic hints..."
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDetector(!showDetector)}
            className="h-8 text-xs gap-1 text-primary border-primary/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Extract</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="h-8 text-xs gap-1 bg-primary text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Term</span>
          </Button>
        </div>
      </div>

      {/* Auto-Extract Drawer */}
      {showDetector && (
        <Card className="p-3 bg-primary/5 border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Learn Unrecognized Medical Terms from Clinical Text
            </span>
            <Button size="sm" variant="ghost" onClick={() => setShowDetector(false)} className="h-6 text-xs">
              Close
            </Button>
          </div>
          <textarea
            rows={3}
            value={detectText}
            onChange={(e) => setDetectText(e.target.value)}
            placeholder="Paste clinical report, history, or difficult anatomical paragraph here to extract candidates..."
            className="w-full text-xs p-2 rounded border border-border bg-card text-foreground"
          />
          <Button
            size="sm"
            onClick={handleRunDetect}
            disabled={!detectText.trim() || isProcessing}
            className="h-7 text-xs bg-primary text-primary-foreground"
          >
            {isProcessing ? 'Analyzing...' : 'Extract & Register Terms'}
          </Button>
        </Card>
      )}

      {/* Quick Add Form */}
      {isAdding && (
        <Card className="p-3 bg-card border-outline-variant/40 space-y-3">
          <form onSubmit={handleCreate} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Medical term (e.g. Spondylolisthesis)"
                className="h-8 text-xs sm:col-span-2"
                autoFocus
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="h-8 text-xs rounded-md border border-border bg-card text-foreground px-2"
              >
                <option value="spine">Spine</option>
                <option value="brain">Brain / Neuro</option>
                <option value="chest">Chest</option>
                <option value="abdomen">Abdomen</option>
                <option value="msk">MSK</option>
                <option value="abbrev">Abbreviation</option>
                <option value="general">General</option>
              </select>
              <select
                value={newModality}
                onChange={(e) => setNewModality(e.target.value as any)}
                className="h-8 text-xs rounded-md border border-border bg-card text-foreground px-2"
              >
                <option value="ALL">All Modalities</option>
                <option value="MRI">MRI</option>
                <option value="CT">CT</option>
                <option value="XRAY">X-Ray</option>
                <option value="US">Ultrasound</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Input
                value={newPhonetic}
                onChange={(e) => setNewPhonetic(e.target.value)}
                placeholder="Phonetic hint (optional, e.g. spon-dye-lo-lis-thee-sis)"
                className="h-8 text-xs flex-1"
              />
              <div className="flex items-center gap-1.5">
                <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
                  Save
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Terms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg border border-outline-variant/30 bg-card hover:border-outline-variant/60 flex items-center justify-between gap-2 transition-all shadow-2xs"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground truncate">{item.term}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                  {item.category}
                </Badge>
              </div>
              {item.phoneticHint && (
                <span className="text-[10px] text-muted-foreground font-mono block truncate">
                  /{item.phoneticHint}/
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteTerm(item.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500 shrink-0"
              title="Delete vocabulary term"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
