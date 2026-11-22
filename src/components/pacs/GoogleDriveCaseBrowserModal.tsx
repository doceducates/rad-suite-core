'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import { Cloud, Folder, FileArchive, RefreshCw, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface GoogleDriveCaseBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GdriveStudy {
  id: string;
  name: string;
  accession: string;
  patientName: string;
  modality: string;
  sizeBytes?: number;
  modifiedTime?: string;
}

export function GoogleDriveCaseBrowserModal({ isOpen, onClose }: GoogleDriveCaseBrowserModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studies, setStudies] = useState<GdriveStudy[]>([]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google/status');
      if (res.ok) {
        const data = await res.json();
        setIsConnected(Boolean(data.isConnected));
        setUserEmail(data.email || null);
        if (data.isConnected) {
          // Fetch cases stored on Google Drive
          fetchDriveCases();
        }
      }
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriveCases = async () => {
    try {
      const res = await fetch('/api/pacs/query?source=gdrive');
      if (res.ok) {
        const data = await res.json();
        if (data.studies && Array.isArray(data.studies)) {
          setStudies(
            data.studies.map((s: any) => ({
              id: s.id || s.accessionNumber,
              name: s.studyDescription || s.patientName || 'DICOM Study',
              accession: s.accessionNumber || 'N/A',
              patientName: s.patientName || 'Unknown Patient',
              modality: s.modality || 'CT',
              modifiedTime: s.studyDate,
            }))
          );
        }
      }
    } catch (err: any) {
      console.warn('[GDRIVE_FETCH_ERROR]', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleConnect = () => {
    window.open('/api/google/auth/url', '_blank', 'width=600,height=700');
    notify.info('Google Authorization', {
      description: 'Please approve access in the Google sign-in window.',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6 flex flex-col gap-5 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-none">Google Drive Personal PACS</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isConnected ? `Connected: ${userEmail || 'Google Account'}` : '15 GB Free Cloud Storage'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'success' : 'outline'} className="text-[10px]">
              {isConnected ? 'Connected' : 'Not Linked'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-container/40 rounded-xl border border-dashed border-border p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h4 className="text-sm font-semibold">Connect Personal Google Drive</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Link your Google account to get 15 GB of private cloud storage. You can upload DICOM zip files from any clinic and open them in Rad Suite without hosting servers.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleConnect} className="gap-2 mt-2">
              <ExternalLink className="w-4 h-4" />
              Connect Google Account
            </Button>
          </div>
        ) : studies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-container/40 rounded-xl border border-border p-6 space-y-2">
            <Folder className="w-8 h-8 text-muted-foreground/60" />
            <h4 className="text-sm font-semibold">No Studies Found in Google Drive</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Studies saved or uploaded to your <code className="text-sky-400 font-mono">Rad Suite Cases/</code> folder will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {studies.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileArchive className="w-5 h-5 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block truncate text-foreground">
                      {st.patientName}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {st.modality} • ACC: {st.accession}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/workstation/${st.accession}?source=gdrive`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shrink-0"
                >
                  Open Viewport
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Google Drive OAuth 2.0 (drive.file scope)</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
