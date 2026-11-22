'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Play, RefreshCw, Key, Code, Loader2 } from 'lucide-react';
import type { BackgroundJob } from '@/services/background-jobs.service';

export function PacsBackgroundServices() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/jobs');
      const data = await res.json();
      if (data.success) setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to load background jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRunJob = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const res = await fetch('/api/system/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setJobs((prev) => prev.map((j) => (j.id === data.job.id ? data.job : j)));
      }
    } catch (err) {
      console.error('Error triggering job:', err);
    } finally {
      setRunningJobId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Background Workers Card */}
      <Card className="border-outline-variant/60 bg-surface shadow-xs">
        <CardHeader className="pb-3 border-b border-outline-variant/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-on-surface">
              <Cpu className="w-4 h-4 text-primary" />
              PACS & System Background Services
            </CardTitle>
            <Button size="sm" variant="outline" onClick={fetchJobs} disabled={loading} className="h-7 text-xs gap-1.5 border-outline-variant/60">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 divide-y divide-outline-variant/40 text-xs">
          {jobs.map((job) => {
            const isRunning = runningJobId === job.id;
            return (
              <div key={job.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface">{job.name}</span>
                    <Badge
                      variant={job.status === 'success' ? 'success' : job.status === 'failed' ? 'danger' : 'outline'}
                      className="text-[10px] uppercase font-mono"
                    >
                      {job.status}
                    </Badge>
                    <span className="text-secondary text-[10px]">Every {job.intervalSec}s</span>
                  </div>
                  <div className="text-secondary text-[11px] font-mono">
                    {job.lastMessage || 'Awaiting schedule trigger'}
                  </div>
                  {job.lastRunAt && (
                    <div className="text-[10px] text-secondary">
                      Last run: {new Date(job.lastRunAt).toLocaleTimeString()} • Executions: {job.runCount}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRunning}
                  onClick={() => handleRunJob(job.id)}
                  className="h-7 text-xs gap-1 border-outline-variant/60 hover:bg-surface-container"
                >
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-primary" />}
                  Trigger Now
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* External API Access & Developer Integrations */}
      <Card className="border-outline-variant/60 bg-surface shadow-xs">
        <CardHeader className="pb-3 border-b border-outline-variant/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-on-surface">
              <Key className="w-4 h-4 text-primary" />
              REST API & External Integration Gateway
            </CardTitle>
            <a
              href="/api/v1/openapi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono"
            >
              <Code className="w-3.5 h-3.5" /> View OpenAPI Spec
            </a>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-3 text-xs">
          <p className="text-secondary text-[11px]">
            Rad Suite is 100% API-ready. Any external service (HIS, EMR, PACS router, or mobile client) can authenticate via HTTP Headers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container-low space-y-1">
              <span className="text-[10px] text-secondary uppercase tracking-wider block font-semibold">Authentication Header</span>
              <code className="text-primary font-mono text-[11px] block select-all">
                X-API-Key: rad-suite-super-secret-crypto-token-2026
              </code>
              <span className="text-secondary text-[10px] block">Or: Authorization: Bearer &lt;token&gt;</span>
            </div>

            <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container-low space-y-1">
              <span className="text-[10px] text-secondary uppercase tracking-wider block font-semibold">Core REST Endpoints</span>
              <div className="font-mono text-[10.5px] text-on-surface space-y-0.5">
                <div><span className="text-primary font-semibold">POST</span> /api/pacs/query</div>
                <div><span className="text-primary font-semibold">POST</span> /api/pacs/import</div>
                <div><span className="text-emerald-600 dark:text-emerald-400 font-semibold">GET</span> /api/v1/health</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
