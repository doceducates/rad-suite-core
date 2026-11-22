'use client';

import React from 'react';

interface ToolbarActionButtonsProps {
  onExport: () => void;
  onUploadGoogleDrive?: () => void;
  uploadingGoogleDrive?: boolean;
}

export function ToolbarActionButtons({
  onExport,
  onUploadGoogleDrive,
  uploadingGoogleDrive = false,
}: ToolbarActionButtonsProps) {
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      {onUploadGoogleDrive && (
        <button
          type="button"
          onClick={onUploadGoogleDrive}
          disabled={uploadingGoogleDrive}
          className="w-6 h-6 flex items-center justify-center bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-sky-500 rounded-md border border-outline-variant/40 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          title="Upload DICOM Study to Personal Google Drive"
        >
          {uploadingGoogleDrive ? (
            <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
          ) : (
            <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onExport}
        className="w-6 h-6 flex items-center justify-center bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-md border border-outline-variant/40 shadow-2xs transition-colors cursor-pointer"
        title="Export DICOM Snapshot"
      >
        <span className="material-symbols-outlined text-[14px]">file_download</span>
      </button>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="w-6 h-6 flex items-center justify-center rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary border border-outline-variant/40 shadow-2xs transition-colors cursor-pointer"
        title="Toggle Workstation Fullscreen"
      >
        <span className="material-symbols-outlined text-[15px]">fullscreen</span>
      </button>
    </div>
  );
}

