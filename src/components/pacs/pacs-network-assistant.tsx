'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Wifi, Cable, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Smartphone, Terminal } from 'lucide-react';
import type { PacsNetworkDiagnostic } from '@/types/pacs';

export function PacsNetworkAssistant() {
  const [diag, setDiag] = useState<PacsNetworkDiagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'ethernet' | 'hmis_wifi'>('ethernet');

  const fetchDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pacs/network');
      const data = await res.json();
      if (data.success) setDiag(data.diagnostic);
    } catch (err) {
      console.error('Failed to load network diagnostic:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostic();
  }, []);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="border-outline-variant/60 bg-surface shadow-xs">
      <CardHeader className="pb-3 border-b border-outline-variant/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-on-surface">
            <Network className="w-4 h-4 text-primary" />
            PACS Network Multi-Homing & Routing Assistant
          </CardTitle>
          <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-lg border border-outline-variant/40">
            <button
              onClick={() => setMode('ethernet')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                mode === 'ethernet'
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Ethernet Cable Mode
            </button>
            <button
              onClick={() => setMode('hmis_wifi')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                mode === 'hmis_wifi'
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              HMIS (SHC&ME) Wi-Fi Mode
            </button>
            <Button size="sm" variant="ghost" onClick={fetchDiagnostic} disabled={loading} className="h-6 text-[11px] px-1.5 ml-0.5">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-on-surface">
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Wi-Fi Interface
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {mode === 'hmis_wifi' ? 'Hospital Intranet' : 'Internet'}
              </span>
            </div>
            <div className="font-mono text-[11px] text-on-surface">{diag?.wifiIp || '192.168.0.108'}</div>
            <div className="text-secondary text-[10px]">Gateway: {diag?.wifiGateway || '192.168.0.1'}</div>
          </div>

          <div className="p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-on-surface">
                {mode === 'hmis_wifi' ? <Smartphone className="w-3.5 h-3.5 text-primary" /> : <Cable className="w-3.5 h-3.5 text-primary" />}
                {mode === 'hmis_wifi' ? 'Mobile USB Tethering' : 'Ethernet Cable'}
              </span>
              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                {mode === 'hmis_wifi' ? '4G/5G Internet' : 'Hospital LAN'}
              </span>
            </div>
            <div className="font-mono text-[11px] text-on-surface">
              {mode === 'hmis_wifi' ? 'Mobile Hotspot / USB' : (diag?.ethernetIp || '192.168.1.150')}
            </div>
            <div className="text-secondary text-[10px]">
              {mode === 'hmis_wifi' ? 'Provides web/AI traffic' : `Gateway: ${diag?.ethernetGateway || '192.168.1.1'}`}
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-on-surface">PACS Server ({diag?.pacsHost || '127.0.0.1'})</span>
              {diag?.isPacsReachable ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Online ({diag.latencyMs}ms)
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Standby
                </span>
              )}
            </div>
            <div className="font-mono text-primary text-[11px]">Subnet: Dedicated PACS Network</div>
            <div className="text-secondary text-[10px]">Remote AE: PACS Archive</div>
          </div>
        </div>

        {mode === 'ethernet' ? (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-medium text-on-surface">Setup: Ethernet Cable (PACS) + Wi-Fi (Internet)</p>
                <p className="text-[11px] text-secondary">
                  Routes all PACS traffic through the Ethernet gateway while preserving Wi-Fi for Internet and AI services.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-lg font-mono text-on-surface text-[11px] border border-outline-variant/40">
              <span className="flex-1 select-all">{diag?.fixCommand || 'route -p add <pacs-subnet> mask 255.255.0.0 <gateway>'}</span>
              <Button size="sm" variant="outline" onClick={() => copyText(diag?.fixCommand || 'route -p add <pacs-subnet> mask 255.255.0.0 <gateway>')} className="h-5 text-[10px] px-2 border-outline-variant/60">
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-medium text-on-surface">Setup: HMIS (SHC&ME) Wi-Fi (PACS) + Phone USB Tethering (Internet)</p>
                <p className="text-[11px] text-secondary">
                  1. Connect Wi-Fi to <strong>HMIS (SHC&ME)</strong>. 2. Connect phone via USB with <strong>USB Tethering</strong> ON. 3. Run script below to auto-bind PACS to Wi-Fi and internet to your phone!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-lg font-mono text-on-surface text-[11px] border border-outline-variant/40">
              <span className="flex-1 select-all">powershell -ExecutionPolicy Bypass -File scripts\fix-pacs-network.ps1</span>
              <Button size="sm" variant="outline" onClick={() => copyText('powershell -ExecutionPolicy Bypass -File scripts\\fix-pacs-network.ps1')} className="h-5 text-[10px] px-2 border-outline-variant/60">
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-secondary">
          <span>💡 Or double-click <code className="text-primary font-mono">scripts\fix-pacs-network.bat</code></span>
          <span>Target: Hospital Central PACS Archive</span>
        </div>
      </CardContent>
    </Card>
  );
}
