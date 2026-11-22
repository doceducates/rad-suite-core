'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Minus, X, Maximize2, MessageSquare, ListFilter, BookOpen } from 'lucide-react';
import { CopilotDdxTab } from './copilot-ddx-tab';
import { CopilotChatTab } from './copilot-chat-tab';
import { CopilotGuidanceTab } from './copilot-guidance-tab';
import type { DifferentialDiagnosisResult } from '@/services/ai-differential.service';

interface AICopilotFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  findings: string;
  impression: string;
  modality?: string;
  clinicalHistory?: string;
  onInsertImpression: (text: string) => void;
}

type CopilotTab = 'ddx' | 'chat' | 'guidance';

export function AICopilotFloatingPanel({
  isOpen,
  onClose,
  findings,
  impression,
  modality = 'CT',
  clinicalHistory,
  onInsertImpression,
}: AICopilotFloatingPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<CopilotTab>('ddx');
  const [ddxResult, setDdxResult] = useState<DifferentialDiagnosisResult | null>(null);
  const [isLoadingDdx, setIsLoadingDdx] = useState(false);

  const fetchDdx = async () => {
    if (!findings.trim() || isLoadingDdx) return;
    try {
      setIsLoadingDdx(true);
      const res = await fetch('/api/ai/differential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings,
          modality,
          clinicalHistory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDdxResult(data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingDdx(false);
    }
  };

  if (!isOpen) return null;

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-14 right-6 z-40 bg-card/95 backdrop-blur-md border border-primary/40 shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-primary hover:scale-105 transition-all text-xs font-medium text-foreground select-none"
        title="Restore AI Radiologist Copilot"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold text-primary">AI Copilot</span>
        {ddxResult && (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/15 text-primary">
            DDx ({ddxResult.differentials.length})
          </span>
        )}
        <Maximize2 className="w-3 h-3 text-muted-foreground ml-1" />
      </div>
    );
  }

  // Expanded Floating Window
  return (
    <div className="fixed bottom-14 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-card/95 backdrop-blur-md border border-primary/30 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 select-text">
      {/* Header Bar */}
      <div className="px-3 py-2 bg-surface-container border-b border-outline-variant/40 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-md bg-primary/15 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="font-headline font-bold text-xs text-foreground">
            AI Radiologist Copilot
          </span>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            {modality}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Minimize to Pill"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-500 cursor-pointer"
            title="Close Copilot"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="px-3 pt-1.5 pb-1 bg-surface-container-low border-b border-border/40 flex items-center gap-1 shrink-0 select-none text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('ddx')}
          className={`flex-1 py-1 rounded-md font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'ddx'
              ? 'bg-card text-primary shadow-2xs border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-container'
          }`}
        >
          <ListFilter className="w-3 h-3" />
          <span>Differentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1 rounded-md font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'chat'
              ? 'bg-card text-primary shadow-2xs border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-container'
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Clinical Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guidance')}
          className={`flex-1 py-1 rounded-md font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'guidance'
              ? 'bg-card text-primary shadow-2xs border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-container'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          <span>Guidance</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'ddx' && (
        <CopilotDdxTab
          ddxResult={ddxResult}
          isLoading={isLoadingDdx}
          onRefresh={fetchDdx}
          onInsertImpression={onInsertImpression}
          findings={findings}
        />
      )}

      {activeTab === 'chat' && (
        <CopilotChatTab
          onInsertImpression={onInsertImpression}
          modality={modality}
          clinicalHistory={clinicalHistory}
          findings={findings}
          impression={impression}
        />
      )}

      {activeTab === 'guidance' && (
        <CopilotGuidanceTab
          pearls={ddxResult?.knowledgePearls}
          onInsertImpression={onInsertImpression}
          modality={modality}
        />
      )}
    </div>
  );
}
