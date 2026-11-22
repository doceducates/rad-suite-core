'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Play, Loader2, ExternalLink, ShieldAlert, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { config } from '@/lib/config';

interface GatewayStatusInfo {
  online: boolean;
  starting: boolean;
  pid?: number | null;
  startedAt?: string | null;
  safetyMode?: string;
  activeSessions?: number;
}

interface HmisGatewayMonitorProps {
  status: GatewayStatusInfo;
  onRefreshStatus: () => Promise<void>;
  onLaunchGateway: () => Promise<void>;
  launching: boolean;
}

export function HmisGatewayMonitor({ status, onRefreshStatus, onLaunchGateway, launching }: HmisGatewayMonitorProps) {
  const [testUser, setTestUser] = useState('');
  const [testPass, setTestPass] = useState('');
  const [testHosp, setTestHosp] = useState('19');
  const [testingAuth, setTestingAuth] = useState(false);
  const [authResult, setAuthResult] = useState<{ ok: boolean; msg: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.hmisHospitalId) setTestHosp(data.data.hmisHospitalId);
          if (data.data.hmisUsername) setTestUser(data.data.hmisUsername);
        }
      })
      .catch(() => {});
  }, []);

  const handleTestAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUser || !testPass) return;
    setTestingAuth(true);
    setAuthResult(null);

    try {
      const res = await fetch('/api/hmis/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUser.trim(),
          password: testPass.trim(),
          hospitalId: testHosp.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthResult({ ok: true, msg: `Authenticated! Session key: ${data.data?.sessionKey || 'Active'}` });
        await onRefreshStatus();
      } else {
        setAuthResult({ ok: false, msg: data.error || 'Authentication rejected by HMIS portal' });
      }
    } catch (err: any) {
      setAuthResult({ ok: false, msg: `Connection error to gateway: ${err.message}` });
    } finally {
      setTestingAuth(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Microservice Diagnostics */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="font-bold text-xs text-foreground">Gateway Process Diagnostics</span>
          </div>
          <Badge variant={status.online ? 'success' : 'danger'} className="text-[10px] py-0 px-1.5">
            {status.online ? 'Port 8080 Active' : 'Gateway Offline'}
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-muted-foreground">Operating Safety Mode:</span>
            <Badge variant="warning" className="text-[10px] py-0 px-1">
              {status.safetyMode || 'STRICT_DRAFT_ONLY'}
            </Badge>
          </div>
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-muted-foreground">Active Browser Contexts:</span>
            <span className="font-mono font-bold text-foreground">{status.activeSessions ?? 0}</span>
          </div>
          {status.pid && (
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-muted-foreground">Process PID:</span>
              <span className="font-mono text-foreground">{status.pid}</span>
            </div>
          )}
          {status.startedAt && (
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-muted-foreground">Started Timestamp:</span>
              <span className="font-mono text-[11px] text-muted-foreground">{status.startedAt}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {!status.online && (
            <Button
              size="sm"
              onClick={onLaunchGateway}
              disabled={launching}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Launch Gateway Process
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`${config.hmisGatewayUrl}/api/docs`, '_blank')}
            className="h-8 text-xs gap-1.5 text-primary border-primary/40"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Interactive Swagger UI
          </Button>
        </div>
      </Card>

      {/* Dynamic Multi-User Credential Tester */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <span className="font-bold text-xs text-foreground">Dynamic Account Authentication Tester</span>
          </div>
          <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
            Multi-Tenant Isolation
          </Badge>
        </div>

        <form onSubmit={handleTestAuth} className="space-y-2.5 text-xs">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">HMIS Portal Username</label>
            <input
              type="text"
              value={testUser}
              onChange={(e) => setTestUser(e.target.value)}
              placeholder="e.g. mustansar.hussain"
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">Portal Password</label>
              <input
                type="password"
                value={testPass}
                onChange={(e) => setTestPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">Hospital ID</label>
              <input
                type="text"
                value={testHosp}
                onChange={(e) => setTestHosp(e.target.value)}
                placeholder="19 (LGH)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={testingAuth || !status.online || !testUser || !testPass}
            className="w-full h-8 text-xs gap-1.5 mt-1"
          >
            {testingAuth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Test Login & Session Isolation
          </Button>

          {authResult && (
            <div className={`p-2.5 rounded-lg text-xs flex flex-col gap-2 ${authResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <div className="flex items-center gap-1.5">
                {authResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{authResult.msg}</span>
              </div>
              {!authResult.ok && /already logged in|another device|collision/i.test(authResult.msg) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await fetch('/api/hmis/force-release', { method: 'POST' });
                    setAuthResult({ ok: true, msg: 'Remote session lock released! Ready to re-authenticate.' });
                    await onRefreshStatus();
                  }}
                  className="h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 self-start"
                >
                  Force Release Session Lock
                </Button>
              )}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
