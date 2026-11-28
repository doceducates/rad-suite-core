import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Home, FileText } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-on-surface p-4 select-none">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-outline-variant/60 bg-surface-container-low text-center space-y-5 shadow-lg animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold font-headline text-on-surface">
            Clinical Route Not Found
          </h1>
          <p className="text-xs text-secondary leading-relaxed">
            The requested diagnostic page or case resource is unavailable or has moved. Your local draft reports and patient findings remain safely intact in the tamper-proof vault.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 text-xs">
          <Link href="/hmis" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full gap-1.5 h-9 font-semibold">
              <FileText className="w-3.5 h-3.5" />
              <span>Return to HMIS</span>
            </Button>
          </Link>

          <Link href="/my-cases" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-9">
              <Home className="w-3.5 h-3.5" />
              <span>My Cases</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
