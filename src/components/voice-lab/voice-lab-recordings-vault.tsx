'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Trash2, Copy, Search, ShieldCheck, Clock, HardDrive, Filter } from 'lucide-react';
import type { VoiceRecordingMeta } from '@/services/voice-vault.service';
import { notify } from '@/services/notification.service';

interface VoiceLabRecordingsVaultProps {
  recordings: VoiceRecordingMeta[];
  totalBytes: number;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onCleanExpired: () => Promise<void>;
  isCleaning: boolean;
}

export function VoiceLabRecordingsVault({
  recordings,
  totalBytes,
  onRefresh,
  onDelete,
  onCleanExpired,
  isCleaning,
}: VoiceLabRecordingsVaultProps) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');

  const filtered = recordings.filter((r) => {
    if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
    if (modalityFilter !== 'all' && (r.modality || '').toUpperCase() !== modalityFilter.toUpperCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.patientName?.toLowerCase().includes(q) ||
        r.patientMrn?.toLowerCase().includes(q) ||
        r.accessionNumber?.toLowerCase().includes(q) ||
        r.rawTranscript?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDaysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) return 'Expired';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days}d`;
  };

  return (
    <div className="space-y-4">
      {/* Telemetry & Retention Bar */}
      <Card className="p-4 bg-surface-container-low border-outline-variant/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <HardDrive className="w-4 h-4 text-primary" />
              <span>Vault Storage: {formatSize(totalBytes)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Retention: 5 Days Rolling Window</span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onCleanExpired}
            disabled={isCleaning}
            className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Expired Audio</span>
          </Button>
        </div>
      </Card>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, MRN, accession, or transcript keywords..."
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-border bg-card text-foreground px-2"
          >
            <option value="all">All Sources</option>
            <option value="reporting_canvas">Reporting Canvas</option>
            <option value="comment">Clinical Comments</option>
            <option value="voice_lab">Voice Lab</option>
          </select>

          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-border bg-card text-foreground px-2"
          >
            <option value="all">All Modalities</option>
            <option value="MRI">MRI</option>
            <option value="CT">CT</option>
            <option value="XRAY">X-Ray</option>
            <option value="US">Ultrasound</option>
          </select>
        </div>
      </div>

      {/* Recordings Grid / List */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <p className="text-xs">No voice recordings found in the vault matching your filter.</p>
          <p className="text-[11px] mt-1">Dictations in the reporting canvas or comments will appear here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <Card key={item.id} className="p-3 bg-card border-outline-variant/30 hover:border-outline-variant transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                {/* Patient Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">{item.patientName || 'Anonymous Case'}</span>
                    {item.patientMrn && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        MRN: {item.patientMrn}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {item.modality || 'CT'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        item.source === 'comment'
                          ? 'border-indigo-500/30 text-indigo-500'
                          : item.source === 'reporting_canvas'
                          ? 'border-emerald-500/30 text-emerald-500'
                          : 'border-zinc-500/30 text-zinc-500'
                      }`}
                    >
                      {item.source === 'comment' ? 'Comment Note' : item.source === 'reporting_canvas' ? 'Report Dictation' : 'Voice Lab'}
                    </Badge>
                    <span className="text-[10px] text-amber-500 font-mono ml-auto md:ml-0">
                      {getDaysLeft(item.expiresAt)}
                    </span>
                  </div>

                  {item.rawTranscript && (
                    <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-surface-container/50 p-1.5 rounded border border-outline-variant/20">
                      &ldquo;{item.rawTranscript}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>By: {item.authorName}</span>
                    <span>•</span>
                    <span>Duration: {item.duration}s</span>
                    <span>•</span>
                    <span>Size: {formatSize(item.size)}</span>
                    <span>•</span>
                    <span>Recorded: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Audio Player & Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                  <audio
                    controls
                    preload="none"
                    src={item.audioUrl}
                    className="h-7 w-44 sm:w-56"
                  />

                  {item.rawTranscript && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(item.rawTranscript!);
                        notify.success('Transcript copied');
                      }}
                      className="h-7 w-7 p-0"
                      title="Copy transcript"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                    title="Delete recording permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
