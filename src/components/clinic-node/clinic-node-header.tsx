'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  HardDrive,
  Sliders,
  Activity,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClinicAddNodeModal } from '@/components/clinic-node/clinic-add-node-modal';
import { DecommissionNodeModal } from '@/components/clinic-node/decommission-node-modal';
import { ClinicRelayConnectModal } from '@/components/clinic-node/clinic-relay-connect-modal';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';

export type ClinicNodeTab = 'studies' | 'config' | 'system';

interface ClinicNodeHeaderProps {
  nodes: ClinicNodeTelemetry[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onRefresh: () => void;
  onDeleteNode?: (nodeId: string, options?: { uninstallAgent: boolean }) => void | Promise<void>;
  loading?: boolean;
  activeTab: ClinicNodeTab;
  setActiveTab: (tab: ClinicNodeTab) => void;
  localCasesCount?: number;
}

export function ClinicNodeHeader({
  nodes,
  selectedNodeId,
  onSelectNode,
  onRefresh,
  onDeleteNode,
  loading = false,
  activeTab,
  setActiveTab,
  localCasesCount = 0,
}: ClinicNodeHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [relayModalOpen, setRelayModalOpen] = useState(false);
  const [decommissionTarget, setDecommissionTarget] = useState<ClinicNodeTelemetry | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const allNodes = nodes.length > 0 ? nodes : [{ nodeId: selectedNodeId, name: selectedNodeId, online: false } as ClinicNodeTelemetry];
  const activeNode = allNodes.find((n) => n.nodeId === selectedNodeId) || allNodes[0];
  const isOnline = Boolean(activeNode.online);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-2 rounded-2xl border border-border/80 bg-card shadow-xs text-xs font-sans">
      {/* Left: Node Selector & Segmented Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Node Selector with inline delete in dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors font-semibold text-foreground cursor-pointer shadow-2xs h-8"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500'
              }`}
            />
            <span className="truncate max-w-[170px]">{activeNode.name || activeNode.nodeId}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-border bg-surface-container-highest/98 dark:bg-surface-container-highest border-outline-variant/80 shadow-2xl backdrop-blur-xl p-1.5 space-y-1 text-on-surface">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/60">
                Registered Clinic Nodes ({allNodes.length})
              </div>

              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {allNodes.map((n) => (
                  <div
                    key={n.nodeId}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      n.nodeId === selectedNodeId
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'hover:bg-surface-container-high/80 cursor-pointer text-foreground'
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        onSelectNode(n.nodeId);
                        setDropdownOpen(false);
                      }}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          n.online ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <div className="truncate">
                        <div>{n.name || n.nodeId}</div>
                        {n.hostname && (
                          <div className="text-[10px] text-muted-foreground font-mono truncate">
                            {n.hostname}
                          </div>
                        )}
                      </div>
                    </div>

                    {allNodes.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(false);
                          setDecommissionTarget(n);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer shrink-0"
                        title={`Remove node ${n.name || n.nodeId}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-1 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setAddModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Node</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Segmented Tab Navigation Pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl border border-border/70 bg-muted/40 h-8">
          <button
            type="button"
            onClick={() => setActiveTab('studies')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'studies'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            <span>Patients &amp; Storage</span>
            {localCasesCount > 0 && (
              <span className="text-[10px] font-mono px-1 rounded bg-primary/15 text-primary font-bold">
                {localCasesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Harvester &amp; Policies</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>System Health</span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          className="h-8 gap-1.5 text-xs cursor-pointer px-2.5"
          title="Register a new Clinic Edge Node"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>Add Node</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRelayModalOpen(true)}
          className="h-8 gap-1.5 text-xs cursor-pointer px-2.5"
          title="Configure Cloud Relay, Secret Token &amp; Download Installer"
        >
          <Settings className="w-3.5 h-3.5 text-primary" />
          <span>Settings</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 w-8 p-0 cursor-pointer shrink-0"
          title="Refresh active node telemetry &amp; catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

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
