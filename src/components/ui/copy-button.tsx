'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard, copyRichHtmlToClipboard } from '@/lib/clipboard';
import { htmlToClinicalText } from '@/lib/clinical-format';
import { cn } from '@/lib/utils';

export interface CopyButtonProps {
  /** The text to copy, or a synchronous / asynchronous function generating it */
  text: string | (() => string | Promise<string>);
  /** Whether the text contains HTML markup that should be converted to clean plain text */
  htmlContent?: boolean;
  /** Whether to write dual MIME rich HTML + plain text to clipboard for TinyMCE/Word */
  richHtml?: boolean;
  /** Visual variant */
  variant?: 'icon' | 'ghost' | 'outline' | 'badge';
  /** Button sizing */
  size?: 'xs' | 'sm' | 'md';
  /** Optional static label displayed alongside the copy icon */
  label?: string;
  /** Optional label shown during the copied state */
  copiedLabel?: string;
  /** Tooltip title */
  title?: string;
  /** Screen reader label */
  ariaLabel?: string;
  /** Extra CSS classes */
  className?: string;
  /** Extra CSS classes for the icon */
  iconClassName?: string;
  /** Callback fired upon successful copy */
  onCopied?: () => void;
  /** Disabled state */
  disabled?: boolean;
}

export function CopyButton({
  text,
  htmlContent = false,
  richHtml = false,
  variant = 'icon',
  size = 'xs',
  label,
  copiedLabel = 'Copied!',
  title = 'Copy to clipboard',
  ariaLabel,
  className,
  iconClassName,
  onCopied,
  disabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled || isCopying) return;

      setIsCopying(true);
      try {
        const rawContent = typeof text === 'function' ? await text() : text;
        if (!rawContent) return;

        let success = false;
        if (richHtml) {
          success = await copyRichHtmlToClipboard(rawContent);
        } else if (htmlContent) {
          const plainText = htmlToClinicalText(rawContent);
          success = await copyToClipboard(plainText);
        } else {
          success = await copyToClipboard(rawContent);
        }

        if (success) {
          setCopied(true);
          onCopied?.();
          setTimeout(() => setCopied(false), 1800);
        }
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      } finally {
        setIsCopying(false);
      }
    },
    [text, htmlContent, richHtml, disabled, isCopying, onCopied]
  );

  const sizeClasses = {
    xs: {
      button: label ? 'px-1.5 py-0.5 text-[10px] gap-1' : 'p-0.5 w-5 h-5',
      icon: 'w-3 h-3',
    },
    sm: {
      button: label ? 'px-2.5 py-1 text-xs gap-1.5' : 'p-1.5 w-7 h-7',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      button: label ? 'px-3 py-1.5 text-sm gap-2' : 'p-2 w-8 h-8',
      icon: 'w-4 h-4',
    },
  };

  const variantClasses = {
    icon: 'text-secondary hover:text-on-surface hover:bg-surface-container-high rounded transition-colors',
    ghost: 'text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors',
    outline: 'border border-outline-variant/60 bg-surface-container/60 hover:bg-surface-container-high text-on-surface rounded-lg transition-all shadow-2xs',
    badge: 'border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface rounded-full transition-colors',
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled || isCopying}
      title={copied ? 'Copied to clipboard!' : title}
      aria-label={ariaLabel || title}
      className={cn(
        'inline-flex items-center justify-center shrink-0 cursor-pointer select-none transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        currentSize.button,
        variantClasses[variant],
        copied && 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
        className
      )}
    >
      {copied ? (
        <Check className={cn(currentSize.icon, 'text-emerald-500 animate-in zoom-in-75 duration-150', iconClassName)} />
      ) : (
        <Copy className={cn(currentSize.icon, iconClassName)} />
      )}
      {label && (
        <span className="font-medium truncate">
          {copied ? copiedLabel : label}
        </span>
      )}
    </button>
  );
}
