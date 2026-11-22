'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, RefreshCw, ExternalLink, Home, Layers, FileText, Loader2 } from 'lucide-react';

interface ZenRadiopaediaPaneProps {
  isResizing?: boolean;
}

export function ZenRadiopaediaPane({ isResizing = false }: ZenRadiopaediaPaneProps) {
  const [currentUrl, setCurrentUrl] = useState('https://radiopaedia.org');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const handleNavigate = (targetUrl: string) => {
    setIsLoading(true);
    setCurrentUrl(targetUrl);
    setReloadKey((k) => k + 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputQuery.trim();
    if (!q) return;

    if (q.startsWith('http://') || q.startsWith('https://')) {
      if (q.includes('radiopaedia.org')) {
        handleNavigate(q);
      }
    } else {
      handleNavigate(`https://radiopaedia.org/search?q=${encodeURIComponent(q)}&scope=all`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Quick Nav Bar */}
      <div className="h-8 px-2 bg-surface-container flex items-center justify-between border-b border-outline-variant/30 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleNavigate('https://radiopaedia.org')}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Radiopaedia Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('https://radiopaedia.org/encyclopaedia/cases/all')}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Browse All Cases"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('https://radiopaedia.org/articles')}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Browse Diagnostic Articles"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Reload Webview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Open in External Browser Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Address / Search Bar */}
      <form onSubmit={handleSearchSubmit} className="p-1.5 border-b border-outline-variant/30 bg-surface/50 flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3 h-3 text-secondary absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Search Radiopaedia cases..."
            className="w-full bg-surface text-[11px] text-on-surface placeholder:text-secondary/60 pl-6 pr-2 py-1 rounded-md border border-outline-variant/40 focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-[10px] font-semibold rounded-md border border-outline-variant/50 transition-colors cursor-pointer shrink-0"
        >
          Go
        </button>
      </form>

      {/* Responsive Live Webview Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-zinc-950">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-[11px] font-mono text-secondary">Loading Radiopaedia...</span>
          </div>
        )}

        {isResizing && <div className="absolute inset-0 z-30 bg-transparent cursor-col-resize" />}

        <iframe
          key={reloadKey}
          src={`/api/radiopaedia/view?url=${encodeURIComponent(currentUrl)}`}
          className={cn('w-full h-full border-none bg-zinc-950', isResizing && 'pointer-events-none')}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Radiopaedia Interactive Webview"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
