'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WorkstationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[WORKSTATION_RECOVERED_ERROR]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 m-4 rounded-xl border border-border bg-surface-container/60 text-center select-none">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-semibold text-foreground">
            {this.props.fallbackTitle || 'Diagnostic View Recovered'}
          </h3>

          <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
            A minor rendering interruption was intercepted and contained.
            Your typed findings, impressions, and case notes remain safely preserved in the local vault.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="gap-2 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Viewport
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Rad Suite Zero-Loss Vault Active</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
