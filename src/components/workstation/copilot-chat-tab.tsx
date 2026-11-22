'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BookOpen, ArrowRight, Check } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedImpression?: string;
  suggestedReportChanges?: {
    clinicalHistory?: string;
    technique?: string;
    findings?: string;
    impression?: string;
  };
  referenceGuideline?: string;
  timestamp: string;
}

interface CopilotChatTabProps {
  onInsertImpression: (text: string) => void;
  onApplyReportChanges?: (changes: {
    clinicalHistory?: string;
    technique?: string;
    findings?: string;
    impression?: string;
  }) => void;
  modality?: string;
  clinicalHistory?: string;
  findings: string;
  impression?: string;
}

const QUICK_PROMPTS = [
  '✨ Polish Whole Report',
  'Fleischner nodule criteria',
  'Rule out mimics',
  'Follow-up interval recommendation',
];

export function CopilotChatTab({
  onInsertImpression,
  onApplyReportChanges,
  modality = 'CT',
  clinicalHistory,
  findings,
  impression,
}: CopilotChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your ${modality} reporting copilot. Ask any clinical question, check staging criteria (ACR/Fleischner), or ask me to polish and structure your report.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [appliedMessageIds, setAppliedMessageIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleApplyChanges = (msgId: string, changes: NonNullable<ChatMessage['suggestedReportChanges']>) => {
    onApplyReportChanges?.(changes);
    setAppliedMessageIds((prev) => ({ ...prev, [msgId]: true }));
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputValue).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsSending(true);

    try {
      // Check if user specifically requested a report polish
      if (text.toLowerCase().includes('polish')) {
        const polishRes = await fetch('/api/ai/polish-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicalHistory,
            findings,
            impression,
            modality,
          }),
        });
        const polishData = await polishRes.json();
        if (polishData.success) {
          const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: '✨ I have structured and polished your entire report with formal radiological phrasing.',
            suggestedReportChanges: {
              clinicalHistory: polishData.clinicalHistory,
              technique: polishData.technique,
              findings: polishData.findings,
              impression: polishData.impression,
            },
            suggestedImpression: polishData.impression,
            referenceGuideline: `${modality} Structured Reporting Guidelines`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          return;
        }
      }

      // Standard conversational copilot inquiry
      const res = await fetch('/api/ai/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          modality,
          clinicalHistory,
          findings,
          impression,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          suggestedImpression: data.suggestedImpression,
          referenceGuideline: data.referenceGuideline,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to retrieve response');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach clinical AI service. Check network or verify patient findings.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-2.5 leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary text-on-primary rounded-br-2xs'
                  : 'bg-muted/50 border border-border/60 text-foreground rounded-bl-2xs'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.referenceGuideline && (
                <div className="mt-1.5 pt-1 border-t border-border/40 flex items-center gap-1 text-[10px] text-primary font-semibold">
                  <BookOpen className="w-2.5 h-2.5" />
                  <span>{msg.referenceGuideline}</span>
                </div>
              )}

              {/* Full Report Changes Suggestion Card */}
              {msg.suggestedReportChanges && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[10px]">
                      <Sparkles className="w-3 h-3" />
                      Polished Report Ready
                    </span>
                    {appliedMessageIds[msg.id] ? (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Applied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyChanges(msg.id, msg.suggestedReportChanges!)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>Apply to Report</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  {msg.suggestedImpression && (
                    <p className="text-[10px] text-secondary italic line-clamp-2">
                      {msg.suggestedImpression.replace(/<[^>]*>/g, ' ').trim()}
                    </p>
                  )}
                </div>
              )}

              {/* Single Impression Suggestion Card (if not full report changes) */}
              {!msg.suggestedReportChanges && msg.suggestedImpression && (
                <div className="mt-2 p-1.5 rounded bg-primary/10 border border-primary/20 text-[11px] text-foreground">
                  <span className="font-semibold text-primary block text-[10px] mb-0.5">
                    Proposed Impression:
                  </span>
                  <p className="italic">{msg.suggestedImpression}</p>
                  <button
                    type="button"
                    onClick={() => onInsertImpression(msg.suggestedImpression!)}
                    className="mt-1 text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>+ Insert to Impression</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-1.5 text-muted-foreground p-2 italic text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
            <span>Consulting clinical literature & analyzing report...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-1.5 border-t border-border/30 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            disabled={isSending}
            className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-[10px] text-secondary font-medium whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-2 border-t border-border/50 bg-surface-container-low shrink-0 flex items-center gap-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask AI Copilot or type 'polish report'..."
          disabled={isSending}
          className="flex-1 bg-surface rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isSending}
          className="p-1.5 rounded-md bg-primary hover:bg-primary-container text-on-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Send query"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
