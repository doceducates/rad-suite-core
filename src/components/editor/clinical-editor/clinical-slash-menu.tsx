'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  HeartHandshake,
  FileText,
  ShieldCheck,
  ListOrdered,
  List,
  Heading2,
  Heading3,
  AlertTriangle,
  Lightbulb,
  Info,
} from 'lucide-react';
import { SlashMenuItem } from './clinical-editor-types';

interface ClinicalSlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function ClinicalSlashMenu({
  items,
  command,
  isMobile = false,
  onClose,
}: ClinicalSlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    const handleScroll = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((idx) => (idx + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((idx) => (idx - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) command(items[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    const handleCustomNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (items.length === 0) return;
      if (detail === 'down') {
        setSelectedIndex((idx) => (idx + 1) % items.length);
      } else if (detail === 'up') {
        setSelectedIndex((idx) => (idx - 1 + items.length) % items.length);
      } else if (detail === 'enter') {
        if (items[selectedIndex]) command(items[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('clinical-slash-nav', handleCustomNav);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('clinical-slash-nav', handleCustomNav);
    };
  }, [items, selectedIndex, command, onClose]);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-3.5 h-3.5 text-violet-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-3.5 h-3.5 text-primary" />;
      case 'ListOrdered':
        return <ListOrdered className="w-3.5 h-3.5 text-amber-500" />;
      case 'List':
        return <List className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'Heading2':
        return <Heading2 className="w-3.5 h-3.5 text-primary" />;
      case 'Heading3':
        return <Heading3 className="w-3.5 h-3.5 text-secondary" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
      case 'Lightbulb':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'Info':
        return <Info className="w-3.5 h-3.5 text-primary" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground text-center">
        No matching templates or commands
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`bg-card text-card-foreground border border-border shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
        isMobile ? 'w-full max-h-[60vh] overflow-y-auto p-1' : 'w-72 max-h-80 overflow-y-auto p-1'
      }`}
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
        <span>Clinical Slash Commands</span>
        <span className="font-mono text-[9px] bg-muted px-1 rounded">↑↓ to navigate</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={`${item.group}-${item.title}`}
              ref={(el) => { itemRefs.current[index] = el; }}
              type="button"
              onClick={() => command(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-2.5 py-1.5 rounded flex items-start gap-2.5 transition-colors cursor-pointer text-xs ${
                isSelected
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              <div className="p-1 rounded bg-muted/60 shrink-0 mt-0.5">
                {renderIcon(item.iconName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate">{item.title}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-primary/10 text-primary">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-1">
                  {item.subtext}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
