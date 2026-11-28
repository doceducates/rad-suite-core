'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Box, Layers, Sparkles, Activity, Microscope, ArrowRight } from 'lucide-react';
import { ANATOMY_MODEL_CATALOG, type AnatomyModelCatalogItem } from '../data/model-catalog';
import { cn } from '@/lib/utils';

interface AtlasModelLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: AnatomyModelCatalogItem) => void;
  activeModelId?: string;
}

export function AtlasModelLibraryModal({
  isOpen,
  onClose,
  onSelectModel,
  activeModelId,
}: AtlasModelLibraryModalProps) {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'system' | 'regional' | 'micro' | 'action'>('all');

  const filteredModels = useMemo(() => {
    return ANATOMY_MODEL_CATALOG.filter((item) => {
      const matchTab = selectedTab === 'all' || item.category === selectedTab;
      const matchSearch =
        search.trim() === '' ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [search, selectedTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/20 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                3D Anatomical Library & Master Models
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Over 120+ Diagnostic Models · Systems, Histology, 3D Cuts & Biomechanics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by structure, organ, system, or motion (e.g. Brain, Neuron, Thorax, Flexion)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-emerald-500/20 rounded-xl text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All', icon: Sparkles },
              { id: 'system', label: 'Systems', icon: Layers },
              { id: 'regional', label: '3D Cuts', icon: Box },
              { id: 'micro', label: 'Micro / Cells', icon: Microscope },
              { id: 'action', label: 'Biomechanics', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer',
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 scrollbar-thin">
          {filteredModels.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-mono">
              No matching 3D models found for "{search}".
            </div>
          ) : (
            filteredModels.map((item) => {
              const isSelected = activeModelId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectModel(item);
                    onClose();
                  }}
                  className={cn(
                    'group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5',
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/30'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span
                        className={cn(
                          'text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                          item.category === 'system'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : item.category === 'regional'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : item.category === 'micro'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        )}
                      >
                        {item.badge}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">Active in Viewport</span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-muted-foreground">
                    <span className="font-mono text-slate-400">{item.id}.glb</span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 font-semibold">
                      Load 3D &rarr;
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Showing {filteredModels.length} models</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition text-xs cursor-pointer font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
