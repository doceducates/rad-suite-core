'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { Database, Cloud, HardDrive, FileText, RefreshCw, CheckCircle, AlertCircle, Play } from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function ReportSyncProvidersCard() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; message: string }>>({});

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/report-sync');
      const data = await res.json();
      if (data.success && data.providers) {
        setProviders(data.providers);
      }
    } catch (err: any) {
      notify.error('Failed to load report sync providers', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestProvider = async (providerId: string) => {
    setTestingId(providerId);
    try {
      const res = await fetch('/api/report-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-provider', providerId }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: data.success,
          latencyMs: data.latencyMs || 0,
          message: data.message || (data.success ? 'Connected' : 'Connection failed'),
        },
      }));

      if (data.success) {
        notify.success(`Sync Provider "${providerId}" OK`, { description: `${data.message} (${data.latencyMs}ms)` });
      } else {
        notify.warning(`Sync Provider "${providerId}" Alert`, { description: data.message });
      }
    } catch (err: any) {
      notify.error(`Test failed for ${providerId}`, { description: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'sqlite_vault':
        return <HardDrive className="w-4 h-4 text-emerald-500" />;
      case 's3_archive':
        return <Cloud className="w-4 h-4 text-sky-500" />;
      case 'postgres_mirror':
        return <Database className="w-4 h-4 text-indigo-500" />;
      case 'google_docs':
        return <FileText className="w-4 h-4 text-amber-500" />;
      default:
        return <Database className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Pluggable Multi-Destination Report Sync Engine
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviders}
            disabled={loading}
            className="h-7 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-secondary text-[11px]">
          Every finalized and signed report is automatically persisted to local storage and mirrored asynchronously to configured cloud and database destinations without UI blocking.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {providers.map((p) => {
            const test = testResults[p.id];
            const isTesting = testingId === p.id;

            return (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(p.id)}
                      <span className="font-semibold text-on-surface text-xs">{p.name}</span>
                    </div>
                    <Badge variant={p.enabled ? 'success' : 'outline'} className="text-[10px]">
                      {p.enabled ? 'Active' : 'Unconfigured'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">{p.description}</p>
                </div>

                <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between">
                  <div className="text-[10px] text-secondary">
                    {test ? (
                      <span className={`flex items-center gap-1 font-mono ${test.success ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {test.success ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {test.latencyMs > 0 ? `${test.latencyMs}ms` : ''} — {test.message.slice(0, 32)}
                      </span>
                    ) : (
                      <span className="text-secondary/70">Ready for diagnostic probe</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isTesting}
                    onClick={() => handleTestProvider(p.id)}
                    className="h-6 px-2 text-[10px] gap-1"
                  >
                    <Play className="w-2.5 h-2.5" />
                    {isTesting ? 'Testing...' : 'Test Sync'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
