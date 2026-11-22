'use client';

import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, Globe, BookOpen } from 'lucide-react';

interface ZenRadiopaediaWebviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseTitle: string;
  radiopaediaUrl: string;
  caseId?: string;
}

export function ZenRadiopaediaWebviewModal({
  isOpen,
  onClose,
  caseTitle,
  radiopaediaUrl,
  caseId,
}: ZenRadiopaediaWebviewModalProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  const proxyUrl = `/api/radiopaedia/view?url=${encodeURIComponent(radiopaediaUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-5xl h-[88vh] bg-surface rounded-2xl border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="h-11 px-3 bg-surface-container flex items-center justify-between border-b border-outline-variant/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
              <Globe className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-headline font-bold text-xs text-foreground truncate max-w-[280px] sm:max-w-md">
                {caseTitle}
              </span>
              {caseId && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-secondary shrink-0">
                  #{caseId.replace('cases/', '')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setReloadKey((k) => k + 1);
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-container-high transition-colors"
              title="Reload page"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <a
              href={radiopaediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-surface-container-high transition-colors flex items-center"
              title="Open full page in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-error rounded-lg hover:bg-surface-container-high transition-colors ml-1"
              title="Close webview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Iframe Container */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-surface/90 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              <span>Loading Radiopaedia case article...</span>
            </div>
          )}
          <iframe
            key={reloadKey}
            src={proxyUrl}
            title={caseTitle}
            onLoad={() => setIsLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="w-full h-full border-0 select-text"
          />
        </div>
      </div>
    </div>
  );
}
