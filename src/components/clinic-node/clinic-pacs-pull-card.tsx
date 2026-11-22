'use client';

import React, { useState } from 'react';
import { Database, DownloadCloud, Search, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClinicCommandResult } from '@/services/clinic-node.service';

interface ClinicPacsPullCardProps {
  onHarvestToday: (modality: string) => Promise<void>;
  onFetchAccession: (accession: string) => Promise<void>;
  lastCommandOutput?: ClinicCommandResult | null;
  loading?: boolean;
}

export function ClinicPacsPullCard({
  onHarvestToday,
  onFetchAccession,
  lastCommandOutput,
  loading = false,
}: ClinicPacsPullCardProps) {
  const [accession, setAccession] = useState('');
  const [harvesting, setHarvesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeModality, setActiveModality] = useState('MR');

  const handleHarvest = async () => {
    setHarvesting(true);
    try {
      await onHarvestToday(activeModality);
    } finally {
      setHarvesting(false);
    }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = accession.trim();
    if (!clean) return;
    setFetching(true);
    try {
      await onFetchAccession(clean);
      setAccession('');
    } finally {
      setFetching(false);
    }
  };

  const isHarvestOutput =
    lastCommandOutput?.command?.includes('harvest-pacs') ||
    lastCommandOutput?.command?.includes('fetch-accession');

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Hospital PACS Direct Harvester
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono">
                Hospital PACS (C-GET)
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Directly query and retrieve cases from central hospital PACS using Calling AET <strong className="text-foreground font-mono">RADIANT</strong> without touching any console PCs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={activeModality}
            onChange={(e) => setActiveModality(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border text-xs font-semibold text-foreground focus:outline-hidden"
          >
            <option value="MR">MR (Magnetic Resonance)</option>
            <option value="CT">CT (Computed Tomography)</option>
            <option value="CR">CR / X-Ray</option>
          </select>

          <Button
            size="sm"
            onClick={handleHarvest}
            disabled={harvesting || loading}
            className="gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${harvesting ? 'animate-spin' : ''}`} />
            <span>{harvesting ? 'Queuing Harvest...' : `Harvest Today's ${activeModality}s`}</span>
          </Button>
        </div>
      </div>

      {/* Protocol Architecture Invariants Badge */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Calling AE Title</span>
          <span className="font-mono font-semibold text-foreground">RADIANT (Whitelisted)</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Called PACS AE</span>
          <span className="font-mono font-semibold text-foreground">PACS_SRV : 8040</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">DIMSE Protocol</span>
          <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">Strict C-GET (Single Assoc)</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Console Reconfig</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 Consoles (Untouched)</span>
        </div>
      </div>

      {/* Single Study On-Demand Fetch */}
      <form onSubmit={handleFetch} className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
        <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Fetch Specific Case from Hospital PACS to Cloud</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={accession}
            onChange={(e) => setAccession(e.target.value)}
            placeholder="Enter Accession Number (e.g. 2609012345 or MRN)..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-muted/30 border border-border/80 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-mono text-foreground"
          />
          <Button
            type="submit"
            size="sm"
            disabled={fetching || loading || !accession.trim()}
            className="gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shrink-0 cursor-pointer"
          >
            <DownloadCloud className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
            <span>{fetching ? 'Queuing Fetch...' : 'Pull to Cloud'}</span>
          </Button>
        </div>
      </form>

      {/* Last Harvest Command Status */}
      {isHarvestOutput && lastCommandOutput && (
        <div className="p-3 rounded-xl bg-black/60 border border-border/50 font-mono text-[11px] space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span className="flex items-center gap-1">
              {lastCommandOutput.exitCode === 0 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              )}
              <span>Last PACS Action: {lastCommandOutput.command}</span>
            </span>
            <span>{new Date(lastCommandOutput.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="text-foreground whitespace-pre-wrap">
            {lastCommandOutput.stdout || lastCommandOutput.stderr}
          </div>
        </div>
      )}
    </div>
  );
}
