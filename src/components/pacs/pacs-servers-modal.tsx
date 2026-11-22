'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Server, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Radio, HardDrive } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import type { PacsServer } from '@/types/pacs';

interface PacsServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export function PacsServersModal({ isOpen, onClose, isAdmin = false }: PacsServersModalProps) {
  const [servers, setServers] = useState<PacsServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pingStates, setPingStates] = useState<Record<string, 'testing' | 'online' | 'offline'>>({});

  // New Server Form State
  const [name, setName] = useState('');
  const [aeTitle, setAeTitle] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('104');
  const [callingAeTitle, setCallingAeTitle] = useState('RADSUITE');
  const [retrieveProtocol, setRetrieveProtocol] = useState<'C-GET' | 'C-MOVE'>('C-GET');
  const [description, setDescription] = useState('');

  const loadServers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pacs/servers');
      const data = await res.json();
      if (data.success && Array.isArray(data.servers)) {
        setServers(data.servers);
      }
    } catch {
      notify.error('Failed to load PACS server configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadServers();
      setIsAdding(false);
    }
  }, [isOpen, loadServers]);

  const handleTestConnection = async (srv: PacsServer) => {
    setPingStates((prev) => ({ ...prev, [srv.id]: 'testing' }));
    try {
      const res = await fetch('/api/pacs/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: srv.host, port: Number(srv.port), serverId: srv.id }),
      });
      const data = await res.json();
      if (data.success && (data.reachable || data.online)) {
        setPingStates((prev) => ({ ...prev, [srv.id]: 'online' }));
        notify.success(data.message || `${srv.name} (${srv.host}:${srv.port}) is reachable!`);
      } else {
        setPingStates((prev) => ({ ...prev, [srv.id]: 'offline' }));
        notify.warning(data.error || data.message || `${srv.name} did not respond: Host unreachable`);
      }
    } catch {
      setPingStates((prev) => ({ ...prev, [srv.id]: 'offline' }));
      notify.error(`Failed to ping ${srv.name}`);
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !aeTitle.trim() || !host.trim() || !port.trim()) {
      notify.warning('Please complete all required PACS server fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/pacs/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), aeTitle: aeTitle.trim().toUpperCase(), host: host.trim(),
          port: parseInt(port.trim(), 10), callingAeTitle: callingAeTitle.trim().toUpperCase() || 'RADSUITE',
          retrieveProtocol, description: description.trim(), isDefault: false, isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.server) {
        notify.success(`PACS server "${data.server.name}" added successfully`);
        setName(''); setAeTitle(''); setHost(''); setPort('104'); setDescription('');
        setIsAdding(false);
        loadServers();
      } else {
        throw new Error(data.error || 'Failed adding server');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error saving PACS server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, srvName: string) => {
    try {
      const res = await fetch(`/api/pacs/servers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        notify.success(`Server "${srvName}" removed`);
        loadServers();
      } else {
        throw new Error(data.error || 'Failed deleting server');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error deleting PACS server');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <span>Configured PACS Servers &amp; DICOM Nodes</span>
        </ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-4 text-xs font-sans">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <p className="text-secondary text-[11px]">
            Manage DICOM DIMSE connections. Default hospital presets and custom PACS nodes for your workstation.
          </p>
          {!isAdding && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="gap-1 h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </Button>
          )}
        </div>

        {/* Add Server Form */}
        {isAdding && (
          <form onSubmit={handleAddServer} className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>Add Custom PACS Server</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-muted-foreground hover:text-foreground text-[11px]"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-foreground">Friendly Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department Orthanc or Regional PACS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground">Remote AE Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORTHANC_CT or PACS_SRV"
                  value={aeTitle}
                  onChange={(e) => setAeTitle(e.target.value.toUpperCase())}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground">Host / IP Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100 or pacs.hospital.org"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Port *</label>
                  <input
                    type="number"
                    required
                    placeholder="104"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Calling AE</label>
                  <input
                    type="text"
                    value={callingAeTitle}
                    onChange={(e) => setCallingAeTitle(e.target.value.toUpperCase())}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving Node...' : 'Save PACS Node'}
              </Button>
            </div>
          </form>
        )}

        {/* Servers List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 text-center text-secondary">Loading PACS nodes...</div>
          ) : servers.length === 0 ? (
            <div className="py-8 text-center text-secondary">No configured PACS servers found.</div>
          ) : (
            servers.map((srv) => {
              const ping = pingStates[srv.id];
              const isSystemDefault = Boolean(srv.isDefault);

              return (
                <div
                  key={srv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-xs">{srv.name}</span>
                      {srv.id === 'pacs-clinic-edge' && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                          Clinic Edge Node
                        </Badge>
                      )}
                      {srv.id === 'pacs-default' && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-secondary/40 text-secondary">
                          Hospital Central
                        </Badge>
                      )}
                      {isSystemDefault && (
                        <Badge variant="info" className="text-[10px] py-0 px-1.5">
                          Default Preset
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
                      <span>AE: <strong className="text-foreground">{srv.aeTitle}</strong></span>
                      <span>•</span>
                      <span>{srv.host}:{srv.port}</span>
                      <span>•</span>
                      <span>Protocol: {srv.retrieveProtocol || 'C-GET'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {/* Ping Status */}
                    {ping === 'online' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Online</span>
                      </span>
                    )}
                    {ping === 'offline' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Unreachable</span>
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ping === 'testing'}
                      onClick={() => handleTestConnection(srv)}
                      className="h-7 px-2 text-xs gap-1 border-border hover:bg-surface-container"
                      title="Test TCP connection to PACS server"
                    >
                      <RefreshCw className={`w-3 h-3 ${ping === 'testing' ? 'animate-spin' : ''}`} />
                      <span>{ping === 'testing' ? 'Testing...' : 'Ping'}</span>
                    </Button>

                    {!isSystemDefault && (isAdmin || srv.userId) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(srv.id, srv.name)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        title="Remove PACS Node"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
