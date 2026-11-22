'use client';

import React, { Component, useEffect, useState, type ReactNode } from 'react';
import type { PluginSlotId, PluginSlotContribution, PluginSlotContext } from '@/lib/plugins/plugin-types';
import { pluginClientRegistry } from '@/lib/plugins/client-registry';
import { Button } from '@/components/ui/button';
import { Puzzle, AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  fallbackTitle: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class PluginErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[PluginError] Failed rendering in slot "${this.props.fallbackTitle}":`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">Plugin error: {this.props.fallbackTitle}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PluginSlotProps {
  slotId: PluginSlotId;
  context?: PluginSlotContext;
  className?: string;
  renderItem?: (contribution: PluginSlotContribution) => ReactNode;
}

export function PluginSlot({ slotId, context, className, renderItem }: PluginSlotProps) {
  const [contributions, setContributions] = useState<PluginSlotContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSlotContributions() {
      try {
        const res = await fetch(`/api/plugins/slots?slotId=${encodeURIComponent(slotId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data.contributions)) {
          setContributions(data.contributions);
        }
      } catch {
        // Silently swallow fetch errors for clean open-core experience
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSlotContributions();
    return () => {
      mounted = false;
    };
  }, [slotId]);

  if (loading || contributions.length === 0) {
    return null;
  }

  return (
    <div className={className || 'flex items-center gap-2'}>
      {contributions.map((c) => (
        <PluginErrorBoundary key={c.id} fallbackTitle={c.title}>
          {renderItem ? (
            renderItem(c)
          ) : (
            <DefaultContributionRenderer contribution={c} context={context} />
          )}
        </PluginErrorBoundary>
      ))}
    </div>
  );
}

function DefaultContributionRenderer({
  contribution,
  context,
}: {
  contribution: PluginSlotContribution;
  context?: PluginSlotContext;
}) {
  const CustomRenderer = pluginClientRegistry.getRenderer(contribution.componentName);
  if (CustomRenderer) {
    return <CustomRenderer contribution={contribution} context={context} />;
  }

  if (contribution.actionUrl) {
    const handleAction = () => {
      const url = new URL(contribution.actionUrl!, window.location.origin);
      if (context?.accession) url.searchParams.set('accession', context.accession);
      if (context?.caseId) url.searchParams.set('caseId', context.caseId);
      window.open(url.toString(), '_blank');
    };

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleAction}
        className="flex items-center gap-1.5 text-xs h-8 border-border"
        title={contribution.title}
      >
        <Puzzle className="w-3.5 h-3.5 text-primary" />
        <span>{contribution.title}</span>
      </Button>
    );
  }

  return null;
}
