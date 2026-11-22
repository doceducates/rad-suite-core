'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  itemName?: string;
  sticky?: boolean;
  className?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  itemName = 'cases',
  sticky = true,
  className,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalCount === 0) return null;

  const start = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-surface-container/95 backdrop-blur-md border-t border-outline-variant/60 text-xs text-secondary font-sans select-none shrink-0',
        sticky && 'sticky bottom-0 z-20 shadow-xs',
        className
      )}
    >
      {/* Left: Range and total counter */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-on-surface">
          Showing <span className="font-bold text-primary font-mono">{start}–{end}</span> of <span className="font-bold text-on-surface font-mono">{totalCount}</span> {itemName}
        </span>
      </div>

      {/* Right: Page size selector and navigation controls */}
      <div className="flex items-center gap-3">
        {/* Page size dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-secondary hidden sm:inline">Rows per page:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-md border border-outline-variant/60 bg-surface-container text-on-surface text-xs font-mono font-medium outline-none focus:border-primary cursor-pointer"
          >
            {[15, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page indicator */}
        <span className="text-[11px] font-mono text-secondary">
          Page <strong className="text-on-surface font-bold">{currentPage}</strong> of <strong className="text-on-surface">{Math.max(1, totalPages)}</strong>
        </span>

        {/* Buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title="First page"
            className="h-7 w-7 p-0 border-outline-variant/60 text-secondary hover:text-on-surface disabled:opacity-30"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Previous page"
            className="h-7 w-7 p-0 border-outline-variant/60 text-secondary hover:text-on-surface disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Next page"
            className="h-7 w-7 p-0 border-outline-variant/60 text-secondary hover:text-on-surface disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Last page"
            className="h-7 w-7 p-0 border-outline-variant/60 text-secondary hover:text-on-surface disabled:opacity-30"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
