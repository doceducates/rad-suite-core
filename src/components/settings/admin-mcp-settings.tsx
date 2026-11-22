'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { notify } from '@/services/notification.service';
import { CreateKeyModal } from './mcp/create-key-modal';
import { McpConnectionGuide } from './mcp/mcp-connection-guide';
import { McpToolsGovernance } from './mcp/mcp-tools-governance';
import {
  Bot,
  Key,
  Shield,
  Plus,
  Terminal,
  Globe,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface AdminMcpSettingsProps {
  isAdmin?: boolean;
}

export function AdminMcpSettings({ isAdmin = true }: AdminMcpSettingsProps) {
  const [subTab, setSubTab] = useState<'keys' | 'governance' | 'guides'>('keys');
  const [keys, setKeys] = useState<any[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/mcp/keys');
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
      }
    } catch {
      notify.error('Could not load agent API keys');
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this Agent API key? Connected agents will immediately lose access.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/mcp/keys?id=${keyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        notify.success('Agent API key revoked');
        fetchKeys();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed to revoke key');
    }
  };

  const handleKeyCreated = (newKey: any) => {
    setKeys((prev) => [newKey, ...prev]);
  };

  const stdioCommand = 'npm --prefix d:\\Projects\\Rad-Reporting\\rad-suite-core run --silent mcp';
  const mcpEndpoint = `${appUrl}/api/mcp`;

  return (
    <div className="space-y-6">
      {/* 1. Server Telemetry & Status Bar */}
      <Card className="bg-surface-container border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-on-surface">Rad Suite MCP Server Gateway</h2>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 text-[10px]">
                  Operational
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Universal Model Context Protocol interface for Claude Desktop, Antigravity, Cursor, and VPS agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 bg-surface-container-low rounded-lg border border-border/60 text-[11px] font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Stdio CLI</span>
              <CopyButton text={stdioCommand} />
            </div>
            <div className="p-2 bg-surface-container-low rounded-lg border border-border/60 text-[11px] font-mono flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span>/api/mcp</span>
              <CopyButton text={mcpEndpoint} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setSubTab('keys')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            subTab === 'keys' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-container'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          Agent API Keys ({keys.filter((k) => k.isActive).length})
        </button>

        <button
          onClick={() => setSubTab('governance')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            subTab === 'governance' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-container'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Tool Governance & RBAC
        </button>

        <button
          onClick={() => setSubTab('guides')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            subTab === 'guides' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-container'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Connection Guides
        </button>
      </div>

      {/* 3. Tab Contents */}
      {subTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-on-surface">Issued Agent Credentials</h3>
              <p className="text-[11px] text-muted-foreground">
                Manage scoped cryptographic keys for autonomous AI agents connecting to this workstation or VPS.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Issue New Agent Key
            </Button>
          </div>

          {isLoadingKeys ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Loading agent keys...</div>
          ) : keys.length === 0 ? (
            <Card className="bg-surface-container-low border-border/60">
              <CardContent className="p-8 text-center space-y-2">
                <Key className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <p className="text-xs font-medium text-on-surface">No Agent API Keys Issued Yet</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Issue an API key to allow Claude Desktop, Cursor, or remote VPS agents to access the worklist and drafting tools.
                </p>
                <div className="pt-2">
                  <Button size="sm" onClick={() => setIsModalOpen(true)}>
                    Issue First Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <Card key={k.id} className={`bg-surface-container-low border-border/60 ${!k.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-on-surface">{k.name}</span>
                        <span className="font-mono text-[11px] bg-surface-container px-2 py-0.5 rounded border border-border">
                          {k.keyPrefix}...
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {k.role}
                        </Badge>
                        {k.isReadOnly ? (
                          <Badge variant="default" className="text-[10px]">
                            Read-Only
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40">
                            Draft-Write
                          </Badge>
                        )}
                        {!k.isActive && (
                          <Badge variant="danger" className="text-[10px]">
                            Revoked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Created: {new Date(k.createdAt).toLocaleDateString()}
                        </span>
                        {k.lastUsedAt && (
                          <span>Last Used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {k.isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRevokeKey(k.id)}
                        className="shrink-0 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'governance' && <McpToolsGovernance />}

      {subTab === 'guides' && (
        <McpConnectionGuide
          appUrl={appUrl}
          sampleKey={keys.find((k) => k.isActive)?.keyPrefix ? `${keys.find((k) => k.isActive).keyPrefix}...` : undefined}
        />
      )}

      <CreateKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onKeyCreated={handleKeyCreated}
      />
    </div>
  );
}
