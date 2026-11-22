'use client';

// Layer 4 (Presentation): Direct DICOM / ZIP Upload Dropzone Modal in PACS (<260 lines)
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileArchive, CheckCircle2, Loader2, ArrowRight, FolderUp } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';

interface CaseUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (study: any) => void;
}

export function CaseUploadModal({ isOpen, onClose, onUploadSuccess }: CaseUploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  const handleReset = () => {
    setUploading(false);
    setProgressText('');
    setProgressPercent(0);
    setUploadResult(null);
  };

  const uploadPayload = async (formData: FormData, fileCount: number) => {
    setUploading(true);
    setProgressPercent(20);
    setProgressText(`Uploading ${fileCount} file(s)...`);

    try {
      setProgressPercent(45);
      setProgressText('Transferring data to workstation sandbox...');

      const res = await fetch('/api/cases/upload', {
        method: 'POST',
        body: formData,
      });

      setProgressPercent(85);
      setProgressText('Parsing DICOM headers & indexing study...');

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process DICOM upload');
      }

      setProgressPercent(100);
      setProgressText('Ingestion complete!');
      setUploadResult(data);
      notify.success(`Case ${data.accessionNumber} ingested successfully (${data.sliceCount} slices)!`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('radsuite:sync-mutation', { detail: { tableName: 'hospital_pacs_studies' } })
        );
      }

      if (onUploadSuccess) onUploadSuccess(data);
    } catch (err: any) {
      notify.error(err?.message || 'DICOM upload failed');
      handleReset();
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    const firstFile = files[0];

    // If single ZIP archive
    if (files.length === 1 && (firstFile.name.endsWith('.zip') || firstFile.type.includes('zip'))) {
      formData.append('file', firstFile);
      uploadPayload(formData, 1);
      return;
    }

    // Multiple DICOM files
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    uploadPayload(formData, files.length);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    if (files.length === 1 && (files[0].name.endsWith('.zip') || files[0].type.includes('zip'))) {
      formData.append('file', files[0]);
      uploadPayload(formData, 1);
    } else {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      uploadPayload(formData, files.length);
    }
  };

  const handleOpenWorkspace = () => {
    if (!uploadResult?.accessionNumber) return;
    onClose();
    router.push(`/workspace/${encodeURIComponent(uploadResult.accessionNumber)}?mode=report`);
  };

  return (
    <Modal isOpen={isOpen} onClose={uploading ? () => {} : onClose} size="lg">
      <ModalHeader onClose={uploading ? undefined : onClose}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>Direct DICOM &amp; ZIP Case Uploader</ModalTitle>
            <ModalDescription>
              Drag and drop an entire DICOM series folder or a single .zip archive into the PACS workstation
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.zip,application/zip,application/dicom"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error - webkitdirectory standard on browsers
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {!uploadResult ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${
              isDragging
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-outline-variant/60 hover:border-primary/50 bg-surface-container'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-card border border-outline-variant/60 flex items-center justify-center text-primary mb-3 shadow-xs">
              {uploading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <h3 className="font-bold text-sm text-on-surface mb-1">
              {uploading ? 'Processing DICOM Payload...' : 'Drop ZIP Archive or DICOM Files Here'}
            </h3>
            <p className="text-xs text-secondary max-w-sm mb-4">
              Supports PACS .zip bundles, multi-slice studies, and loose .dcm slice directories.
            </p>

            {uploading ? (
              <div className="w-full max-w-md space-y-2">
                <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-outline-variant/50">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono text-primary font-medium animate-pulse">
                  {progressText}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 font-bold cursor-pointer"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Choose Files / ZIP</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  className="gap-1.5 font-semibold cursor-pointer border-outline-variant/60"
                >
                  <FolderUp className="w-3.5 h-3.5" />
                  <span>Select Folder</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">Case Ingested Successfully!</h4>
                <p className="text-xs text-secondary">
                  Ready for immediate reporting and cross-sectional review.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-card border border-outline-variant/60 text-xs">
              <div>
                <span className="text-[10px] text-secondary block font-semibold">Accession</span>
                <span className="font-mono font-bold text-primary">{uploadResult.accessionNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-secondary block font-semibold">Patient</span>
                <span className="font-bold truncate block">{uploadResult.patientName}</span>
              </div>
              <div>
                <span className="text-[10px] text-secondary block font-semibold">Modality</span>
                <span className="font-mono font-semibold">{uploadResult.modality}</span>
              </div>
              <div>
                <span className="text-[10px] text-secondary block font-semibold">Slices</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {uploadResult.sliceCount} instances
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleOpenWorkspace}
              className="w-full gap-2 font-bold py-2.5 text-sm shadow-md cursor-pointer"
            >
              <span>Open in Workstation Viewer &amp; Report</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={uploading} className="cursor-pointer">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
