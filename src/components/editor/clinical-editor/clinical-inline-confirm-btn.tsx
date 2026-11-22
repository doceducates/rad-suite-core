'use client';

// Layer 4 (Presentation): Inline Confirmation Action Button for Safe Deletion and Release
// Eliminates accidental comment loss with in-place Tick (✔) and Close (✖) confirmation
import React, { useState, useEffect, useRef } from 'react';
import { Check, Trash2, X } from 'lucide-react';

interface ClinicalInlineConfirmBtnProps {
  actionType: 'resolve' | 'delete';
  onConfirm: () => void;
  title?: string;
  label?: string;
  className?: string;
}

export function ClinicalInlineConfirmBtn({
  actionType,
  onConfirm,
  title,
  label,
  className = '',
}: ClinicalInlineConfirmBtnProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isConfirming) {
      timeoutRef.current = setTimeout(() => setIsConfirming(false), 5000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isConfirming]);

  const handleTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(true);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(false);
    onConfirm();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(false);
  };

  if (isConfirming) {
    const isDelete = actionType === 'delete';
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold animate-in fade-in zoom-in-95 duration-100 select-none ${
          isDelete
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
        }`}
      >
        <span className="text-[9px] uppercase tracking-wide select-none">
          {isDelete ? 'Delete?' : 'Release?'}
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          className={`p-0.5 rounded hover:scale-110 transition-transform cursor-pointer ${
            isDelete
              ? 'hover:bg-rose-500/30 text-rose-500'
              : 'hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}
          title="Confirm"
        >
          <Check className="w-3 h-3 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (actionType === 'delete') {
    return (
      <button
        type="button"
        onClick={handleTrigger}
        className={
          className ||
          'p-1 rounded hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer flex items-center gap-1'
        }
        title={title || 'Delete Note'}
      >
        <Trash2 className="w-3 h-3" />
        {label && <span>{label}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleTrigger}
      className={
        className ||
        'p-1 rounded hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1'
      }
      title={title || 'Resolve and release note'}
    >
      <Check className="w-3 h-3" />
      {label && <span>{label}</span>}
    </button>
  );
}
