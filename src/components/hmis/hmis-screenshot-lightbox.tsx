'use client';

// Layer 4 (Presentation): HMIS Ephemeral Screenshot Lightbox Viewer
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface HmisScreenshotLightboxProps {
  filename: string | null;
  patientName?: string;
  accession?: string;
  onClose: () => void;
}

export function HmisScreenshotLightbox({
  filename,
  patientName,
  accession,
  onClose,
}: HmisScreenshotLightboxProps) {
  if (!filename) return null;

  const imageUrl = `/api/hmis/screenshot/${encodeURIComponent(filename)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-surface border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
            <div className="truncate">
              <span className="font-bold text-xs text-on-surface">HMIS Save Proof</span>
              {accession && (
                <span className="text-[10px] font-mono text-secondary ml-1.5">
                  ({patientName || 'Patient'} • {accession})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
              title="Open full size image in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Stage */}
        <div className="flex-1 overflow-auto bg-black/40 flex items-center justify-center p-2 min-h-[250px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`HMIS Audit Proof for ${accession || 'study'}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg border border-outline-variant/30"
            loading="eager"
          />
        </div>

        {/* Footer Note */}
        <div className="px-3 py-1.5 bg-surface-container-low border-t border-outline-variant/30 text-[10px] text-secondary font-mono flex items-center justify-between">
          <span>Ephemeral audit proof • Auto-purged on close</span>
          <button
            type="button"
            onClick={onClose}
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
