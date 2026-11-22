'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, Activity, Plus, CheckCircle2, XCircle, Loader2, Star, Trash2 } from 'lucide-react';
import { PacsServerForm } from './pacs-server-form';
import type { PacsServer } from '@/types/pacs';

interface PacsServerCardProps {
  initialServers: PacsServer[];
}

export function PacsServerCard({ initialServers }: PacsServerCardProps) {
  const [servers, setServers] = useState<PacsServer[]>(initialServers);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { reachable: boolean; latencyMs?: number; error?: string }>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const handleTestConnection = async (srv: PacsServer) => {
    setTestingId(srv.id);
    try {
      const res = await fetch('/api/pacs/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: srv.host, port: srv.port }),
      });
      const data = await res.json();
      setPingResults((prev) => ({
        ...prev,
        [srv.id]: {
          reachable: data.reachable,
          latencyMs: data.latencyMs,
          error: data.error,
        },
      }));
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [srv.id]: { reachable: false, error: 'Network request failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async (formData: Omit<PacsServer, 'id'> & { id?: string }) => {
    try {
      const res = await fetch('/api/pacs/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.server) {
        setServers((prev) => [...prev.filter((s) => s.id !== data.server.id), data.server]);
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Failed to save PACS node:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this PACS server?')) return;
    try {
      const res = await fetch(`/api/pacs/servers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setServers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete PACS server:', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch('/api/pacs/servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setServers((prev) =>
          prev.map((s) => ({ ...s, isDefault: s.id === id }))
        );
      }
    } catch (err) {
      console.error('Failed to set default server:', err);
    }
  };

  return (
    <Card className="border-outline-variant/60 bg-surface shadow-xs text-xs font-sans">
      <CardHeader className="pb-3 border-b border-outline-variant/60">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-on-surface">
              <Server className="w-4 h-4 text-primary" />
              Configured PACS Locations & DICOM Nodes
            </CardTitle>
            <p className="text-[11px] text-secondary mt-0.5">
              Manage DICOM C-FIND/C-GET/C-MOVE routing parameters and destination AE titles
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)} className="h-7 text-xs gap-1 border-outline-variant/60">
            <Plus className="w-3.5 h-3.5" /> Add Location
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {showAddForm && (
          <PacsServerForm
            onSave={handleSave}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <div className="divide-y divide-outline-variant/40">
          {servers.map((srv) => {
            const ping = pingResults[srv.id];
            const isTesting = testingId === srv.id;

            return (
              <div key={srv.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface text-sm">{srv.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      AE: {srv.aeTitle}
                    </Badge>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        srv.retrieveProtocol === 'C-MOVE'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {srv.retrieveProtocol === 'C-MOVE'
                        ? `C-MOVE (${srv.callingAeTitle}:${srv.listenerPort})`
                        : 'C-GET (Direct)'}
                    </span>
                    {srv.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-secondary font-mono text-[11px]">
                    Host: <strong className="text-on-surface">{srv.host}:{srv.port}</strong> • Calling AE: <strong className="text-on-surface">{srv.callingAeTitle}</strong> (Listener Port: {srv.listenerPort})
                  </div>
                  {srv.description && (
                    <div className="text-secondary text-[11px]">{srv.description}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {ping && (
                    ping.reachable ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Online ({ping.latencyMs}ms)
                      </span>
                    ) : (
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20" title={ping.error}>
                        <XCircle className="w-3.5 h-3.5" /> Offline
                      </span>
                    )
                  )}

                  {!srv.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetDefault(srv.id)}
                      title="Set as Default Server"
                      className="h-7 text-xs gap-1 text-secondary hover:text-primary"
                    >
                      <Star className="w-3.5 h-3.5" /> Set Default
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(srv)}
                    disabled={isTesting}
                    className="h-7 text-xs gap-1.5 border-outline-variant/60 text-secondary hover:text-on-surface"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-primary" />}
                    Test Node
                  </Button>

                  {servers.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(srv.id)}
                      title="Delete Server"
                      className="h-7 w-7 p-0 text-secondary hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
