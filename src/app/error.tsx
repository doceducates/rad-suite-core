'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, FileText, ShieldCheck } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[WORKSTATION_RUNTIME_ERROR]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-on-surface p-4 select-none">
      <div className="max-w-lg w-full p-6 sm:p-8 rounded-2xl border border-destructive/30 bg-surface-container-low text-center space-y-5 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold font-headline text-on-surface">
            Diagnostic Interruption Intercepted
          </h1>
          <p className="text-xs text-secondary leading-relaxed">
            A rendering interruption occurred in this view. To ensure clinical safety, the workstation contained the fault.
          </p>
        </div>

        {/* Zero-Loss Vault Assurance Banner */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-left flex items-start gap-2.5 text-xs text-secondary">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            <strong>Zero-Loss Local Vault Active:</strong> All typed impressions, findings, measurements, and draft reports remain securely preserved in your local SQLite WAL vault.
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 text-xs">
          <Button
            variant="primary"
            size="sm"
            onClick={() => reset()}
            className="w-full sm:w-auto gap-1.5 h-9 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Viewport</span>
          </Button>

          <Link href="/worklist" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-9">
              <FileText className="w-3.5 h-3.5" />
              <span>Return to Worklist</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
