'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, RefreshCw, Search, CheckCircle2, XCircle, Laptop, Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notify } from '@/services/notification.service';
import type { WorkstationItem } from '@/services/telemetry.service';

interface ClientWorkstationsTabProps {
  initialWorkstations?: WorkstationItem[];
}

export function ClientWorkstationsTab({ initialWorkstations = [] }: ClientWorkstationsTabProps) {
  const [workstations, setWorkstations] = useState<WorkstationItem[]>(initialWorkstations);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [loading, setLoading] = useState(false);

  const fetchWorkstations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/telemetry/workstations?limit=100');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWorkstations(json.data);
      } else {
        notify.error('Failed to refresh workstations list');
      }
    } catch {
      notify.error('Network error updating workstations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialWorkstations.length === 0) {
      fetchWorkstations();
    }
  }, []);

  const filtered = workstations.filter((w) => {
    const matchSearch =
      !search ||
      w.machineId.toLowerCase().includes(search.toLowerCase()) ||
      w.hostname.toLowerCase().includes(search.toLowerCase()) ||
      (w.lastUserName && w.lastUserName.toLowerCase().includes(search.toLowerCase())) ||
      w.ipAddress.includes(search);

    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search by hostname, machine ID, doctor, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-9 bg-surface-container"
          />
          <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/60 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-white font-medium shadow-2xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              All ({workstations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('online')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'online'
                  ? 'bg-primary text-white font-medium shadow-2xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Online ({workstations.filter((w) => w.status === 'online').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('offline')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'offline'
                  ? 'bg-primary text-white font-medium shadow-2xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Offline ({workstations.filter((w) => w.status === 'offline').length})
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchWorkstations}
            disabled={loading}
            className="gap-1.5 h-9 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Workstations Table Card */}
      <Card className="border-outline-variant/80 bg-surface-container shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Monitor className="w-8 h-8 text-secondary/50 mx-auto" />
              <p className="text-xs text-secondary font-medium">
                {workstations.length === 0
                  ? 'No workstation clients registered yet. Telemetry reports automatically when the desktop app launches.'
                  : 'No workstations match the active filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-high/50 text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Workstation Hostname</th>
                    <th className="py-2.5 px-3">Platform & Version</th>
                    <th className="py-2.5 px-3">Last Active Clinician</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filtered.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-container-highest/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {w.status === 'online' ? (
                          <Badge variant="success" className="gap-1 text-[10px] font-medium py-0 px-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] font-medium py-0 px-1.5 opacity-70">
                            Offline
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-on-surface flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className="truncate max-w-[180px]">{w.hostname}</span>
                        </div>
                        <div className="text-[10px] text-secondary font-mono truncate max-w-[180px]">
                          {w.machineId}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-on-surface font-medium capitalize">{w.platform}</div>
                        <div className="text-[10px] text-secondary font-mono">v{w.appVersion}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {w.lastUserName ? (
                          <div className="flex items-center gap-1 text-on-surface">
                            <User className="w-3 h-3 text-primary shrink-0" />
                            <span className="font-medium truncate max-w-[140px]">{w.lastUserName}</span>
                          </div>
                        ) : (
                          <span className="text-secondary text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-secondary whitespace-nowrap">
                        {w.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-3 text-secondary text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{new Date(w.lastSeenAt).toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
