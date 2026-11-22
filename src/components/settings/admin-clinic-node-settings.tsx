'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClinicNodeHeader, type ClinicNodeTab } from '@/components/clinic-node/clinic-node-header';
import { ClinicNodeOverviewTab } from '@/components/clinic-node/clinic-node-overview-tab';
import { ClinicNodeConfigTab } from '@/components/clinic-node/clinic-node-config-tab';
import { ClinicNodeToolsTab } from '@/components/clinic-node/clinic-node-tools-tab';
import { ClinicUnifiedPatientTable } from '@/components/clinic-node/clinic-unified-patient-table';
import { notify } from '@/services/notification.service';
import { clinicTaskTracker } from '@/services/clinic-task-tracker.service';
import type { ClinicNodeTelemetry, ClinicActionType } from '@/services/clinic-node.service';

const INITIAL_TELEMETRY: ClinicNodeTelemetry = {
  nodeId: 'node-desktop-1ldu8l1',
  online: false,
  orthancStatus: 'stopped',
  disk: { totalGb: 512, usedGb: 142, freeGb: 370, usedPercent: 28, maxStorageSizeGb: 100 },
  casesToday: 0,
  targetCases: 50,
  instancesToday: 0,
  syncedStudies: [],
  lastHeartbeat: null,
  pendingAction: null,
  autoRetention: { enabled: false, ageDays: 3 },
  localStudies: [],
};

export function AdminClinicNodeSettings() {
  const [telemetry, setTelemetry] = useState<ClinicNodeTelemetry>(INITIAL_TELEMETRY);
  const [nodes, setNodes] = useState<ClinicNodeTelemetry[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-desktop-1ldu8l1');
  const [activeTab, setActiveTab] = useState<ClinicNodeTab>('studies');
  const [loading, setLoading] = useState(false);

  const fetchTelemetry = useCallback(async (nodeId?: string) => {
    setLoading(true);
    try {
      const activeId = nodeId || selectedNodeId;
      clinicTaskTracker.setActiveNodeId(activeId);
      const res = await fetch(`/api/clinic-node?nodeId=${encodeURIComponent(activeId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.telemetry) {
          setTelemetry(data.telemetry);
          clinicTaskTracker.syncWithTelemetry(data.telemetry);
        }
        if (Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
          // Smart Auto-Selection: prefer populated or online nodes over empty placeholders
          const currentValid = data.nodes.find((n: any) => n.nodeId === activeId);
          if (!currentValid || (activeId === 'clinic-pc-primary' && data.nodes.some((n: any) => n.nodeId !== 'clinic-pc-primary'))) {
            const bestNode =
              data.nodes.find((n: any) => n.online) ||
              data.nodes.find((n: any) => (n.localStudies?.length || 0) > 0 || (n.casesToday || 0) > 0) ||
              data.nodes.find((n: any) => n.nodeId === 'node-desktop-1ldu8l1') ||
              data.nodes[0];
            if (bestNode && bestNode.nodeId !== activeId) {
              setSelectedNodeId(bestNode.nodeId);
              fetchTelemetry(bestNode.nodeId);
              return;
            }
          }
        }
      }
    } catch {
      // Automatic recovery on next poll
    } finally {
      setLoading(false);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => fetchTelemetry(), 6000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  const handleAction = async (action: ClinicActionType, payload?: any) => {
    try {
      if (action === 'save-all-settings') {
        await clinicTaskTracker.trackSettingsSave(selectedNodeId, payload, async (act, p) => {
          const res = await fetch('/api/clinic-node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId: selectedNodeId, action: act, payload: p }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed executing action');
          return data;
        });
        await fetchTelemetry();
        return;
      }
      const res = await fetch('/api/clinic-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: selectedNodeId, action, payload }),
      });
      const data = await res.json();
      if (data.success) {
        const msg = data.message || `Action '${action}' submitted.`;
        notify.success(msg);
        await fetchTelemetry();
      } else {
        throw new Error(data.error || 'Failed executing action');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error communicating with clinic node');
    }
  };

  const handleDeleteNode = async (nodeId: string, options?: { uninstallAgent?: boolean }) => {
    try {
      const res = await fetch('/api/clinic-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, action: 'remove-node', payload: options }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(data.message || `Node '${nodeId}' decommissioned.`);
        const remaining = nodes.filter((n) => n.nodeId !== nodeId);
        setNodes(remaining);
        const nextId = remaining[0]?.nodeId || '';
        if (selectedNodeId === nodeId) {
          setSelectedNodeId(nextId);
          fetchTelemetry(nextId);
        } else {
          fetchTelemetry();
        }
      } else {
        throw new Error(data.error || 'Failed to remove node');
      }
    } catch (e: any) {
      notify.error(e.message || `Failed to remove node '${nodeId}'`);
      throw e;
    }
  };

  const localCount = (telemetry.localStudies || []).length;

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Consolidated Cockpit Header Bar */}
      <ClinicNodeHeader
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          fetchTelemetry(nodeId);
        }}
        onRefresh={() => fetchTelemetry(selectedNodeId)}
        onDeleteNode={handleDeleteNode}
        loading={loading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        localCasesCount={localCount}
      />

      {/* Tab Panels */}
      {activeTab === 'studies' && (
        <ClinicUnifiedPatientTable
          localStudies={telemetry.localStudies || []}
          syncedStudies={telemetry.syncedStudies || []}
          onAction={handleAction}
          onRefreshNode={() => fetchTelemetry(selectedNodeId)}
          loadingNode={loading}
          selectedNodeId={selectedNodeId}
        />
      )}

      {activeTab === 'config' && (
        <ClinicNodeConfigTab
          telemetry={telemetry}
          selectedNodeId={selectedNodeId}
          loading={loading}
          onAction={handleAction}
        />
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          <ClinicNodeOverviewTab
            telemetry={telemetry}
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            loading={loading}
            onRefresh={() => fetchTelemetry(selectedNodeId)}
            onAction={handleAction}
          />
          <ClinicNodeToolsTab
            telemetry={telemetry}
            selectedNodeId={selectedNodeId}
            loading={loading}
            onAction={handleAction}
          />
        </div>
      )}
    </div>
  );
}
