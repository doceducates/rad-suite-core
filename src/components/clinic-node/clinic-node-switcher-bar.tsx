'use client';

import React, { useState } from 'react';
import { Plus, Download, RefreshCw, Trash2, Radio, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClinicAddNodeModal } from '@/components/clinic-node/clinic-add-node-modal';
import { DecommissionNodeModal } from '@/components/clinic-node/decommission-node-modal';
import { ClinicRelayConnectModal } from '@/components/clinic-node/clinic-relay-connect-modal';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';

interface ClinicNodeSwitcherBarProps {
  nodes: ClinicNodeTelemetry[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onRefresh: () => void;
  onDeleteNode?: (nodeId: string, options?: { uninstallAgent: boolean }) => void | Promise<void>;
  loading?: boolean;
}

export function ClinicNodeSwitcherBar({
  nodes,
  selectedNodeId,
  onSelectNode,
  onRefresh,
  onDeleteNode,
  loading = false,
}: ClinicNodeSwitcherBarProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [relayModalOpen, setRelayModalOpen] = useState(false);
  const [decommissionTarget, setDecommissionTarget] = useState<ClinicNodeTelemetry | null>(null);

  const allNodes = nodes.length > 0 ? nodes : [{ nodeId: selectedNodeId, name: selectedNodeId, online: false } as ClinicNodeTelemetry];
  const activeNode = allNodes.find((n) => n.nodeId === selectedNodeId) || allNodes[0];
  const isOnline = Boolean(activeNode.online);

  return (
    <div className="space-y-2">
      <Card className="border-border/70 bg-card shadow-xs">
        <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Active Node Dropdown & Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-foreground">Clinic Edge Node:</span>
              <select
                value={activeNode.nodeId}
                onChange={(e) => onSelectNode(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
              >
                {allNodes.map((n) => (
                  <option key={n.nodeId} value={n.nodeId}>
                    {n.name || n.nodeId} {n.hostname ? `(${n.hostname})` : ''} {n.online ? '• 🟢 Online' : '• 🔴 Standby'}
                  </option>
                ))}
              </select>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                }`}
              >
                {isOnline ? '🟢 Connected (Session 0)' : '🔴 Standby (Hospital PC Off)'}
              </span>

              {activeNode.relayedFrom && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/25">
                  ☁️ {activeNode.relayedFrom.replace(/^https?:\/\//, '')}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRelayModalOpen(true)}
              className="gap-1.5 text-xs h-7.5 cursor-pointer"
              title="Configure Cloud Relay bridge for desktop / localhost clients"
            >
              <Cloud className="w-3.5 h-3.5 text-primary" />
              <span>Cloud Relay</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="gap-1.5 text-xs h-7.5 cursor-pointer"
              title="Refresh active node status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <a
              href="/api/clinic-node/bundle"
              download="clinic-node-package.zip"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium hover:bg-surface-container transition-colors h-7.5"
              title="Download universal installer package (.ZIP) for clinic PC"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Installer (.ZIP)</span>
            </a>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddModalOpen(true)}
              className="gap-1.5 text-xs h-7.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </Button>

            {allNodes.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDecommissionTarget(activeNode)}
                className="h-7.5 px-2 text-muted-foreground hover:text-rose-500 cursor-pointer"
                title="Decommission or remove this node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ClinicAddNodeModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onNodeRegistered={(newNodeId) => {
          onSelectNode(newNodeId);
          onRefresh();
        }}
      />

      <DecommissionNodeModal
        isOpen={decommissionTarget !== null}
        onClose={() => setDecommissionTarget(null)}
        node={decommissionTarget}
        onConfirm={async (nodeId, options) => {
          await onDeleteNode?.(nodeId, options);
        }}
        loading={loading}
      />

      <ClinicRelayConnectModal
        isOpen={relayModalOpen}
        onClose={() => setRelayModalOpen(false)}
        onConfigChanged={onRefresh}
      />
    </div>
  );
}
