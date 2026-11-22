'use client';

import React, { useState } from 'react';
import { AtlasContainer } from './components/AtlasContainer';
import { AnatomicalDictionary } from './data/dictionary';
import { useAtlasStore } from './state/atlasStore';
import {
  Activity,
  Cpu,
  Layers,
  Search,
  Sparkles,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof AnatomicalDictionary.search>>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { selectStructure, resetAll } = useAtlasStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length > 1) {
      setSearchResults(AnatomicalDictionary.search(q, 10));
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  };

  const handleSelectSearchResult = (id: string) => {
    selectStructure(id);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Professional Diagnostic Header */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between z-30 select-none backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                Next-Gen 3D Body Atlas
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 font-mono font-semibold rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                v2.0 Vitrea Suite
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive 3D Anatomy & Multi-Planar DICOM Cross-Sectional Analysis
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-80">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search 2,919 structures (e.g. Aorta, Biceps, Femur)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner"
            />
          </div>

          {/* Search Autocomplete Popup */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-800">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectSearchResult(item.id)}
                  className="w-full text-left p-2 hover:bg-slate-800 transition flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block font-serif italic">
                      {item.latinName}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase font-mono">
                    {item.system}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Diagnostic Metadata & Status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] text-emerald-400">DirectX 12 / WebGPU Active</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-400 font-mono text-[11px]">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>2,919 Structures</span>
          </div>

          <button
            onClick={resetAll}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md transition text-xs font-medium border border-slate-700"
            title="Reset scene to initial state"
          >
            <RotateCcw className="w-3 h-3" /> Reset View
          </button>
        </div>
      </header>

      {/* Main Full-Screen 3D Atlas Workspace */}
      <main className="flex-1 relative overflow-hidden">
        <AtlasContainer className="w-full h-full" showControls={true} />
      </main>
    </div>
  );
}
