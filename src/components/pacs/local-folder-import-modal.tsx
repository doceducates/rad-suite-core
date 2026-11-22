'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, FolderSearch, HardDrive, CheckCircle2, Loader2, ExternalLink, UploadCloud } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import type { DiscoveredStudySummary, DetectedFolderInfo } from '@/services/local-folder-import.service';

interface LocalFolderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function LocalFolderImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: LocalFolderImportModalProps) {
  const router = useRouter();
  const [folderPath, setFolderPath] = useState('');
  const [detectedFolders, setDetectedFolders] = useState<DetectedFolderInfo[]>([]);
  const [loadingDetected, setLoadingDetected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discoveredStudies, setDiscoveredStudies] = useState<DiscoveredStudySummary[]>([]);
  const [totalSlices, setTotalSlices] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch detected storage paths on open
  useEffect(() => {
    if (!isOpen) {
      setHasScanned(false);
      setDiscoveredStudies([]);
      return;
    }
    async function loadDetected() {
      setLoadingDetected(true);
      try {
        const res = await fetch('/api/pacs/import-folder');
        const data = await res.json();
        if (data.success && Array.isArray(data.detectedFolders)) {
          setDetectedFolders(data.detectedFolders);
          const firstExisting = data.detectedFolders.find((d: DetectedFolderInfo) => d.exists);
          if (firstExisting) setFolderPath(firstExisting.path);
        }
      } catch {}
      setLoadingDetected(false);
    }
    loadDetected();
  }, [isOpen]);

  const handleScanPath = async (targetPath = folderPath) => {
    const trimmed = targetPath.trim();
    if (!trimmed) {
      notify.warning('Please enter or select a valid local folder path.');
      return;
    }

    setScanning(true);
    const progressId = notify.progress({
      title: 'Scanning local directory...',
      current: 1, total: 2,
      statusText: `Reading DICOM files in ${trimmed}`,
    });

    try {
      const res = await fetch('/api/pacs/import-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: trimmed }),
      });
      const data = await res.json();
      notify.dismiss(progressId);

      if (!res.ok || !data.success) {
        notify.error(data.error || 'Failed scanning local folder');
        return;
      }

      setDiscoveredStudies(data.studies || []);
      setTotalSlices(data.totalFiles || 0);
      setHasScanned(true);

      notify.success(`Imported ${data.studyCount} studies (${data.totalFiles} slices) into PACS workstation!`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('radsuite:sync-mutation', { detail: { tableName: 'hospital_pacs_studies' } }));
      }
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      notify.dismiss(progressId);
      notify.error(err.message || 'Error communicating with local server');
    } finally {
      setScanning(false);
    }
  };

  const handleBrowserFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setScanning(true);
    const progressId = notify.progress({
      title: 'Importing selected folder...',
      current: 1, total: files.length,
      statusText: `Ingesting ${files.length} DICOM files from browser`,
    });

    try {
      const formData = new FormData();
      for (const file of files) formData.append('files', file);

      const res = await fetch('/api/cases/upload-bundle', { method: 'POST', body: formData });
      const data = await res.json();
      notify.dismiss(progressId);

      if (!res.ok) {
        notify.error(data.error || 'Failed to ingest folder files');
        return;
      }

      notify.success(`Case ${data.accessionNumber} (${data.sliceCount} slices) imported successfully!`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('radsuite:sync-mutation', { detail: { tableName: 'hospital_pacs_studies' } }));
      }

      if (onImportComplete) onImportComplete();
      onClose();
      router.push(`/workstation/${encodeURIComponent(data.accessionNumber)}`);
    } catch (err: any) {
      notify.dismiss(progressId);
      notify.error(err.message || 'Error uploading folder files');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <FolderOpen className="w-4 h-4" />
        </div>
        <div>
          <ModalTitle>Import Local DICOM Folder &amp; Studies</ModalTitle>
          <ModalDescription>
            Scan directories or import folders containing diagnostic DICOM studies.
          </ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Quick Detected Path Chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            Detected Workstation Drives &amp; Folders
          </label>
          <div className="flex flex-wrap gap-1.5">
            {detectedFolders.map((d) => (
              <button
                key={d.path}
                type="button"
                onClick={() => {
                  setFolderPath(d.path);
                  if (d.exists) handleScanPath(d.path);
                }}
                disabled={!d.exists || scanning}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                  d.exists
                    ? folderPath === d.path
                      ? 'bg-primary/15 border-primary text-primary font-bold shadow-2xs'
                      : 'bg-surface-container border-outline-variant/60 hover:border-primary/50 text-on-surface'
                    : 'bg-surface-container-low border-outline-variant/30 text-secondary/40 cursor-not-allowed opacity-60'
                }`}
                title={d.exists ? `Click to scan ${d.path}` : 'Folder not present on host'}
              >
                <span>{d.path}</span>
                {d.exists && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                    {d.studyCount} cases
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Path Input Form */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-secondary">
            Local Disk Directory Path
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g. E:\Cases or C:\MedicalSandbox\Cases"
              disabled={scanning}
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <Button
              type="button"
              onClick={() => handleScanPath()}
              disabled={scanning || !folderPath.trim()}
              className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white shrink-0 cursor-pointer"
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderSearch className="w-3.5 h-3.5" />}
              <span>Scan &amp; Index</span>
            </Button>
          </div>
        </div>

        {/* Browser Directory Upload (Client-side / Web Fallback) */}
        <div
          onClick={() => !scanning && fileInputRef.current?.click()}
          className="border border-dashed border-outline-variant/70 hover:border-primary/60 bg-surface-container-low/50 hover:bg-surface-container/70 rounded-xl p-2.5 flex items-center justify-between gap-3 text-secondary text-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="font-semibold text-on-surface">Browse Web Folder (Zero-Storage Web Client)</span>
              <p className="text-[10px] text-secondary">Local client-side parsing; for PC disk use 1-click Scan above</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="pointer-events-none text-xs h-6 px-2">Browse...</Button>
          <input
            ref={fileInputRef}
            type="file"
            {...({ webkitdirectory: '', directory: '' } as any)}
            multiple
            onChange={handleBrowserFolderUpload}
            className="hidden"
          />
        </div>

        {/* Scan Results View */}
        {hasScanned && (
          <div className="space-y-2 border-t border-outline-variant/40 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Discovered {discoveredStudies.length} Studies ({totalSlices.toLocaleString()} slices)
              </span>
              <span className="text-[11px] text-secondary font-mono">{folderPath}</span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-outline-variant/50 divide-y divide-outline-variant/30 bg-surface-container-low text-xs">
              {discoveredStudies.map((s) => (
                <div
                  key={s.accessionNumber}
                  className="p-2 flex items-center justify-between gap-2 hover:bg-surface-container transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface truncate">{s.patientName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary">
                        {s.modality}
                      </span>
                    </div>
                    <div className="text-[11px] text-secondary flex items-center gap-2 truncate">
                      <span>ACC: {s.accessionNumber}</span>
                      <span>•</span>
                      <span>{s.numSeries} series ({s.numInstances} slices)</span>
                      <span>•</span>
                      <span>{s.studyDescription}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { onClose(); router.push(`/workstation/${encodeURIComponent(s.accessionNumber)}`); }}
                    className="h-7 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
