'use client';

// Layer 4 (Presentation): Canonical Reusable Dropdown Menu Primitive
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  locked?: boolean;
  danger?: boolean;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export interface DropdownMenuProps {
  trigger?: React.ReactNode;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  items: DropdownMenuItem[];
  onSelect?: (id: string) => void;
  direction?: 'auto' | 'up' | 'down';
  align?: 'auto' | 'left' | 'right' | 'center';
  header?: string;
  className?: string;
  menuClassName?: string;
  triggerClassName?: string;
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  trigger,
  triggerLabel = 'Options',
  triggerIcon,
  items,
  onSelect,
  direction = 'auto',
  align = 'auto',
  header,
  className,
  menuClassName,
  triggerClassName,
  disabled = false,
  isOpen: controlledIsOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const menuRef = useRef<HTMLDivElement>(null);
  const [effectiveDirection, setEffectiveDirection] = useState<'up' | 'down'>(
    direction === 'up' ? 'up' : 'down'
  );
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right' | 'center'>(
    align === 'right' || align === 'center' ? align : 'left'
  );

  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (menuRef.current && typeof window !== 'undefined') {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = 250;

      if (direction === 'auto') {
        if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
          setEffectiveDirection('up');
        } else {
          setEffectiveDirection('down');
        }
      } else {
        setEffectiveDirection(direction);
      }

      if (align === 'auto' || align === 'left') {
        const estimatedWidth = 224; // w-56 is 14rem = 224px
        if (rect.left + estimatedWidth > window.innerWidth - 16 && rect.right >= estimatedWidth) {
          setEffectiveAlign('right');
        } else {
          setEffectiveAlign('left');
        }
      } else {
        setEffectiveAlign(align);
      }
    }
  }, [isOpen, direction, align]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }[effectiveAlign];

  const directionClasses = effectiveDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div className={cn('relative inline-flex items-center', className)} ref={menuRef}>
      {/* Trigger */}
      {trigger ? (
        <div
          onClick={(e) => {
            if (disabled) return;
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        >
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          aria-expanded={isOpen}
          className={cn(
            'inline-flex items-center gap-1.5 h-7.5 sm:h-8 px-2.5 rounded-lg border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed',
            isOpen && 'bg-surface-container-high border-primary/50 text-primary',
            triggerClassName
          )}
        >
          {triggerIcon}
          <span>{triggerLabel}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-150', isOpen && 'rotate-180')} />
        </button>
      )}

      {/* Popover Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute w-56 p-1.5 bg-surface-container-highest/98 backdrop-blur-xl border border-outline-variant/80 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-on-surface max-h-[min(380px,calc(100vh-32px))] overflow-y-auto scrollbar-thin',
            directionClasses,
            alignClasses,
            menuClassName
          )}
        >
          {header && (
            <div className="px-2.5 py-1 text-[10px] font-semibold text-secondary uppercase tracking-wider border-b border-outline-variant/50 mb-1">
              {header}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const isItemDisabled = item.disabled || item.locked;

              if (item.locked) {
                return (
                  <div
                    key={item.id}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium opacity-60 cursor-not-allowed select-none border-t border-outline-variant/40 mt-0.5 pt-1.5"
                    title="Action locked per safety invariants"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="line-through text-secondary">{item.label}</span>
                        <span className="text-[9px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 rounded">
                          {item.badge || 'Locked'}
                        </span>
                      </div>
                      {item.sublabel && (
                        <span className="text-[10px] text-secondary">{item.sublabel}</span>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isItemDisabled}
                  onClick={() => {
                    setIsOpen(false);
                    if (item.onClick) {
                      item.onClick();
                    } else {
                      onSelect?.(item.id);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    item.active
                      ? 'bg-primary/15 text-primary font-bold'
                      : item.danger
                      ? 'hover:bg-error/10 text-error'
                      : 'hover:bg-surface-container text-on-surface',
                    item.className
                  )}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1 rounded bg-surface-container-high text-secondary">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.sublabel && (
                      <span className="text-[10px] text-secondary/70 truncate">{item.sublabel}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
