'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FolderArchive, Loader2 } from 'lucide-react';
import { notify } from '@/services/notification.service';

interface DicomDragDropZoneProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function DicomDragDropZone({ children, disabled = false }: DicomDragDropZoneProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || isProcessing) return;

      const types = Array.from(e.dataTransfer.types || []);
      if (types.includes('Files')) {
        dragCounter.current += 1;
        setIsDragging(true);
      }
    },
    [disabled, isProcessing]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || isProcessing) return;

      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    },
    [disabled, isProcessing]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (disabled || isProcessing) return;

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;

      setIsProcessing(true);
      const progressId = notify.progress({
        title: 'Processing dropped DICOM payload...',
        current: 1,
        total: 2,
        statusText: 'Reading DICOM files and series',
      });

      try {
        const formData = new FormData();
        const zipFile = files.find((f) => f.name.toLowerCase().endsWith('.zip'));

        if (zipFile) {
          formData.append('zip', zipFile);
        } else {
          // Add all DICOM files
          for (const f of files) {
            formData.append('files', f);
          }
        }

        const res = await fetch('/api/cases/upload-bundle', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        notify.dismiss(progressId);

        if (!res.ok) {
          notify.error(data.error || 'Failed to ingest DICOM bundle');
          return;
        }

        notify.success(
          `Case ${data.accessionNumber} ingested successfully (${data.sliceCount} slices)!`
        );

        // Navigate to newly ingested case
        router.push(`/workstation/${encodeURIComponent(data.accessionNumber)}`);
      } catch (err: any) {
        notify.dismiss(progressId);
        notify.error(err?.message || 'Error uploading DICOM files');
      } finally {
        setIsProcessing(false);
      }
    },
    [disabled, isProcessing, router]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-full h-full min-h-0 flex-1 overflow-hidden"
    >
      {children}

      {/* Visual Drag Over Indicator Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-primary animate-in fade-in duration-150 p-6">
          <div className="bg-surface-container-high border border-outline-variant/60 rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <UploadCloud className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">
              Drop DICOM Files or .ZIP Archive
            </h3>
            <p className="text-xs text-secondary mb-4 leading-relaxed">
              Release to instantly import study sequences into your local diagnostic workstation.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-tertiary bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Supports .zip archives and .dcm series folders</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-6">
          <div className="bg-surface-container-high border border-outline-variant/60 rounded-2xl p-6 flex flex-col items-center shadow-xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <span className="text-xs font-semibold text-on-surface">Ingesting DICOM Study...</span>
            <span className="text-[11px] text-secondary mt-1">Extracting slices and building filmstrip</span>
          </div>
        </div>
      )}
    </div>
  );
}
