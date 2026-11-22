// Layer 2: Clinic Node Telemetry & Remote Administrative Management Service
import fs from 'fs';
import path from 'path';
import { logAudit } from './audit.service';
import type { ClinicNodeTelemetry, ClinicActionType, InFlightStudyClaim, PeerNodeInfo } from './clinic-node.types';
import { applyClinicActionSettings } from './clinic-action-handler';
import {
  reconcileNodeLeases,
  getInFlightStudies,
  claimStudyLease,
  releaseStudyLease,
  isStudyClaimedByPeer,
  clearAllLeases,
} from './clinic-lease.service';

export { getInFlightStudies, claimStudyLease, releaseStudyLease, isStudyClaimedByPeer };
export * from './clinic-node.types';

import {
  readRegistryDisk,
  writeRegistryDisk,
  readPendingActionDisk,
  writePendingActionDisk,
  PENDING_ACTIONS_FILE,
  REGISTRY_FILE,
  DECOMMISSIONED_FILE,
  markNodeDecommissioned,
  clearNodeDecommissioned,
  isNodeDecommissioned,
  DEFAULT_TELEMETRY,
  getNodesStore,
} from './clinic-node-storage';
export { handshakeClinicNode, type ClinicHandshakePayload, type ClinicHandshakeResult } from './clinic-node-registration.service';
export { getNodesStore };

const HEARTBEAT_TIMEOUT_MS = 45000;

export function updateClinicNodeConfig(nodeId: string, updates: Partial<ClinicNodeTelemetry>): { success: boolean } {
  const store = getNodesStore();
  const current = store.get(nodeId) || { ...DEFAULT_TELEMETRY, nodeId };
  const updated: ClinicNodeTelemetry = { ...current, ...updates, disk: updates.disk ? { ...current.disk, ...updates.disk } : current.disk };
  store.set(nodeId, updated);
  writeRegistryDisk(store);
  return { success: true };
}



export function getClinicNodeStatus(nodeId?: string): ClinicNodeTelemetry {
  const store = getNodesStore();
  const globalTel = (globalThis as any).__rad_suite_clinic_telemetry;
  const targetId = nodeId || (globalTel && store.has(globalTel.nodeId) ? globalTel.nodeId : undefined);
  const telemetry = (targetId ? store.get(targetId) : null) || Array.from(store.values())[0] || store.get(DEFAULT_TELEMETRY.nodeId) || { ...DEFAULT_TELEMETRY };
  const isOnline = telemetry.lastHeartbeat !== null && Date.now() - new Date(telemetry.lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;
  return { ...telemetry, online: isOnline };
}

export function getAllClinicNodes(): ClinicNodeTelemetry[] {
  const store = getNodesStore();
  return Array.from(store.values())
    .filter((node) => !isNodeDecommissioned(node.nodeId))
    .map((node) => ({
      ...node,
      online: node.lastHeartbeat !== null && Date.now() - new Date(node.lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS,
    }));
}

export async function getClinicNodeStatusWithRelay(nodeId?: string): Promise<{
  telemetry: ClinicNodeTelemetry;
  nodes: ClinicNodeTelemetry[];
}> {
  const { fetchGatewayNodes } = await import('./clinic-gateway-client');
  const gatewayResult = await fetchGatewayNodes(nodeId);
  if (gatewayResult && gatewayResult.telemetry) {
    const store = getNodesStore();
    const validGatewayIds = new Set(gatewayResult.nodes.map((n) => n.nodeId));
    for (const [id, node] of store.entries()) {
      const isLocalDirect = !node.relayedFrom && node.lastHeartbeat !== null &&
        Date.now() - new Date(node.lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;
      if (!isLocalDirect && !validGatewayIds.has(id)) {
        store.delete(id);
      }
    }
    for (const n of gatewayResult.nodes) {
      const existing = store.get(n.nodeId) || { ...DEFAULT_TELEMETRY, nodeId: n.nodeId };
      store.set(n.nodeId, {
        ...existing,
        ...n,
        name: n.name || existing.name || n.nodeId,
        hostname: n.hostname || existing.hostname || '',
        syncedStudies: n.syncedStudies || existing.syncedStudies || [],
        localStudies: n.localStudies || existing.localStudies || [],
      });
    }
    const all = getAllClinicNodes();
    const target = all.find((n) => n.nodeId === (nodeId || gatewayResult.telemetry?.nodeId)) || all[0];
    (globalThis as any).__rad_suite_clinic_telemetry = target;
    return { telemetry: target, nodes: all };
  }

  const local = getClinicNodeStatus(nodeId);
  if (local.online && !local.relayedFrom) {
    return { telemetry: local, nodes: getAllClinicNodes() };
  }

  const { fetchRelayedClinicStatus } = await import('./clinic-relay.service');
  const relayed = await fetchRelayedClinicStatus(nodeId);
  if (relayed && relayed.telemetry) {
    const store = getNodesStore();
    const validRelayedIds = new Set(relayed.nodes.map((n) => n.nodeId));
    for (const [id, node] of store.entries()) {
      const isLocalDirect = !node.relayedFrom && node.lastHeartbeat !== null &&
        Date.now() - new Date(node.lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;
      if (!isLocalDirect && !validRelayedIds.has(id)) {
        store.delete(id);
      }
    }
    for (const n of relayed.nodes) {
      clearNodeDecommissioned(n.nodeId);
      const existing = store.get(n.nodeId) || { ...DEFAULT_TELEMETRY, nodeId: n.nodeId };
      store.set(n.nodeId, { ...existing, ...n, name: n.name || existing.name || n.nodeId, hostname: n.hostname || existing.hostname || '' });
    }
    writeRegistryDisk(store);
    const all = getAllClinicNodes();
    const target = all.find((n) => n.nodeId === (nodeId || relayed.telemetry?.nodeId)) || all[0];
    (globalThis as any).__rad_suite_clinic_telemetry = target;
    return { telemetry: target, nodes: all };
  }

  return { telemetry: local, nodes: getAllClinicNodes() };
}

export function recordClinicHeartbeat(payload: Partial<ClinicNodeTelemetry> & { token?: string }): {
  success: boolean;
  pendingAction: string | null;
  inFlightStudies: InFlightStudyClaim[];
  peerNodes?: PeerNodeInfo[];
} {
  const targetId = payload.nodeId || DEFAULT_TELEMETRY.nodeId;
  if (isNodeDecommissioned(targetId)) {
    return {
      success: true,
      pendingAction: 'uninstall-agent',
      inFlightStudies: [],
    };
  }
  const store = getNodesStore();
  const current = store.get(targetId) || { ...DEFAULT_TELEMETRY, nodeId: targetId };
  const diskAction = readPendingActionDisk(targetId);
  const currentAction = current.pendingAction || diskAction;
  writePendingActionDisk(targetId, null);
  const isSettingsInFlight = typeof currentAction === 'string' &&
    (currentAction.startsWith('save-all-settings') || currentAction.startsWith('set-sync-rules') || currentAction.startsWith('set-harvest-schedule'));

  const updated: ClinicNodeTelemetry = {
    ...current,
    nodeId: targetId,
    name: current.name || payload.name || targetId,
    hostname: payload.hostname || current.hostname || '',
    lanIp: payload.lanIp || current.lanIp || '',
    orthancStatus: payload.orthancStatus || current.orthancStatus,
    disk: payload.disk ? { ...payload.disk, maxStorageSizeGb: payload.disk.maxStorageSizeGb ?? current.disk?.maxStorageSizeGb ?? 100 } : current.disk,
    casesToday: payload.casesToday ?? current.casesToday,
    instancesToday: payload.instancesToday ?? current.instancesToday,
    syncedStudies: payload.syncedStudies || current.syncedStudies,
    activeDownload: payload.activeDownload !== undefined ? payload.activeDownload : current.activeDownload,
    downloadQueue: payload.downloadQueue !== undefined ? payload.downloadQueue : current.downloadQueue,
    activeUpload: payload.activeUpload !== undefined ? payload.activeUpload : current.activeUpload,
    uploadQueue: payload.uploadQueue !== undefined ? payload.uploadQueue : current.uploadQueue,
    googleDrive: payload.googleDrive || current.googleDrive,
    pacsStatus: payload.pacsStatus || current.pacsStatus,
    s3Status: payload.s3Status || current.s3Status,
    syncRules: isSettingsInFlight ? (current.syncRules || DEFAULT_TELEMETRY.syncRules) : (payload.syncRules || current.syncRules || DEFAULT_TELEMETRY.syncRules),
    lastCommandOutput: payload.lastCommandOutput !== undefined ? payload.lastCommandOutput : current.lastCommandOutput,
    syncPaused: payload.syncPaused !== undefined ? payload.syncPaused : (current.syncPaused !== undefined ? current.syncPaused : false),
    schedule: payload.schedule !== undefined ? payload.schedule : current.schedule,
    harvestSchedule: isSettingsInFlight ? (current.harvestSchedule || DEFAULT_TELEMETRY.harvestSchedule) : (payload.harvestSchedule || current.harvestSchedule || DEFAULT_TELEMETRY.harvestSchedule),
    diagnostics: payload.diagnostics !== undefined ? payload.diagnostics : current.diagnostics,
    compression: payload.compression || current.compression,
    heartbeatIntervalMs: payload.heartbeatIntervalMs || current.heartbeatIntervalMs,
    autoRetention: current.autoRetention || payload.autoRetention,
    stallWatchdog: current.stallWatchdog !== undefined ? current.stallWatchdog : payload.stallWatchdog,
    peerCooperation: current.peerCooperation !== undefined ? current.peerCooperation : payload.peerCooperation,
    localStudies: payload.localStudies || current.localStudies,
    inventorySummary: payload.inventorySummary !== undefined ? payload.inventorySummary : current.inventorySummary,
    scriptVersion: payload.scriptVersion || current.scriptVersion,
    knownNetworks: (current.knownNetworks && current.knownNetworks.length > 0)
      ? current.knownNetworks
      : (payload.knownNetworks || current.knownNetworks || []),
    wifiIsolation: payload.wifiIsolation !== undefined ? payload.wifiIsolation : current.wifiIsolation,
    lastHeartbeat: new Date().toISOString(),
    pendingAction: null,
  };

  // Dynamic HA Failover: promote secondary if no active primary within 150s
  const now = Date.now();
  const otherNodes = Array.from(store.values()).filter((n) => n.nodeId !== targetId);
  const activePrimary = otherNodes.find(
    (n) => n.harvestSchedule?.enabled && n.lastHeartbeat && (now - new Date(n.lastHeartbeat).getTime() < 150000)
  );

  if (updated.peerCooperation?.autoFailover !== false) {
    if (!activePrimary && !updated.harvestSchedule?.enabled) {
      updated.harvestSchedule = { ...(updated.harvestSchedule || DEFAULT_TELEMETRY.harvestSchedule), enabled: true } as any;
    } else if (activePrimary && updated.harvestSchedule?.enabled) {
      updated.harvestSchedule = { ...updated.harvestSchedule, enabled: false } as any;
    }
  }

  const peerNodes: PeerNodeInfo[] = otherNodes
    .filter((n) => n.lastHeartbeat && (now - new Date(n.lastHeartbeat).getTime() < 300000) && n.lanIp && n.lanIp !== '127.0.0.1')
    .map((n) => ({
      nodeId: n.nodeId,
      name: n.name || n.nodeId,
      hostname: n.hostname || '',
      lanIp: n.lanIp || '',
      isPrimaryHarvester: Boolean(n.harvestSchedule?.enabled),
      role: n.harvestSchedule?.enabled ? 'primary' : 'secondary_console',
      orthancHttpPort: 18042,
      lastHeartbeat: n.lastHeartbeat,
    }));

  store.set(targetId, updated);
  writeRegistryDisk(store);
  (globalThis as any).__rad_suite_clinic_telemetry = updated;
  reconcileNodeLeases(targetId, payload.activeUpload, payload.activeDownload);

  return {
    success: true,
    pendingAction: currentAction,
    inFlightStudies: getInFlightStudies(targetId),
    peerNodes,
  };
}

export async function dispatchClinicAction(
  action: ClinicActionType,
  user: { id: string; name: string },
  payload?: any,
  targetNodeId?: string
): Promise<{ success: boolean; message: string }> {
  const store = getNodesStore();
  const targetId = targetNodeId || DEFAULT_TELEMETRY.nodeId;

  if (action === 'register-node') {
    clearNodeDecommissioned(targetId);
    const existing = store.get(targetId) || { ...DEFAULT_TELEMETRY, nodeId: targetId };
    const registered: ClinicNodeTelemetry = {
      ...existing,
      nodeId: targetId,
      name: payload?.name || existing.name || targetId,
      hostname: payload?.hostname || existing.hostname || '',
      ...(payload || {}),
    };
    store.set(targetId, registered);
    writeRegistryDisk(store);
    await logAudit({
      userId: user.id, userName: user.name, action: 'ADMIN_CLINIC_NODE_ACTION',
      entityType: 'System', entityId: targetId, details: `Admin ${user.name} registered clinic node ${targetId}`,
    });
    return { success: true, message: `Node '${targetId}' successfully registered.` };
  }

  if (action === 'rename-node') {
    const newName = typeof payload === 'string' ? payload.trim() : (payload?.name || '').trim();
    if (!newName) return { success: false, message: 'Node name cannot be empty.' };
    const current = store.get(targetId) || { ...DEFAULT_TELEMETRY, nodeId: targetId };
    current.name = newName;
    store.set(targetId, current);
    writeRegistryDisk(store);
    await logAudit({
      userId: user.id, userName: user.name, action: 'ADMIN_CLINIC_NODE_ACTION',
      entityType: 'System', entityId: targetId, details: `Admin ${user.name} renamed node ${targetId} to '${newName}'`,
    });
    const { dispatchGatewayAction } = await import('./clinic-gateway-client');
    await dispatchGatewayAction(targetId, action, payload).catch(() => {});
    const { dispatchRelayedClinicAction } = await import('./clinic-relay.service');
    await dispatchRelayedClinicAction(action, payload, targetId).catch(() => {});
    return { success: true, message: `Node '${targetId}' renamed to '${newName}'.` };
  }

  if (action === 'remove-node') {
    const shouldUninstall = payload?.uninstallAgent !== false;
    if (shouldUninstall) {
      markNodeDecommissioned(targetId);
      writePendingActionDisk(targetId, 'uninstall-agent');
    } else {
      clearNodeDecommissioned(targetId);
      writePendingActionDisk(targetId, null);
    }
    store.delete(targetId);
    writeRegistryDisk(store);
    if ((globalThis as any).__rad_suite_clinic_telemetry?.nodeId === targetId) {
      (globalThis as any).__rad_suite_clinic_telemetry = Array.from(store.values())[0] || { ...DEFAULT_TELEMETRY };
    }
    await logAudit({
      userId: user.id, userName: user.name, action: 'ADMIN_CLINIC_NODE_ACTION',
      entityType: 'System', entityId: targetId, details: `Admin ${user.name} decommissioned clinic node ${targetId}${shouldUninstall ? ' (with agent teardown queued)' : ' (dashboard only)'}`,
    });
    const { dispatchGatewayAction } = await import('./clinic-gateway-client');
    await dispatchGatewayAction(targetId, action, payload).catch(() => {});
    const { dispatchRelayedClinicAction } = await import('./clinic-relay.service');
    await dispatchRelayedClinicAction(action, payload, targetId).catch(() => {});
    return { success: true, message: `Node '${targetId}' successfully removed${shouldUninstall ? ' and teardown queued' : ''}.` };
  }

  const actionString = payload !== undefined ? `${action}:${typeof payload === 'string' ? payload : JSON.stringify(payload)}` : action;
  const current = store.get(targetId) || { ...DEFAULT_TELEMETRY, nodeId: targetId };
  current.pendingAction = actionString;
  writePendingActionDisk(targetId, actionString);

  applyClinicActionSettings(current, action, payload);
  store.set(targetId, current);

  const isLocallyDirect = !current.relayedFrom && current.lastHeartbeat !== null &&
    Date.now() - new Date(current.lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;

  let relayMessage: string | null = null;
  const { dispatchGatewayAction } = await import('./clinic-gateway-client');
  const gatewayRes = await dispatchGatewayAction(targetId, action, payload);
  if (gatewayRes?.success) {
    relayMessage = gatewayRes.message;
  } else if (!isLocallyDirect) {
    const { dispatchRelayedClinicAction } = await import('./clinic-relay.service');
    const relayedRes = await dispatchRelayedClinicAction(action, payload, targetId);
    if (relayedRes?.success) relayMessage = relayedRes.message;
  }

  await logAudit({
    userId: user.id, userName: user.name, action: 'ADMIN_CLINIC_NODE_ACTION',
    entityType: 'System', entityId: current.nodeId, details: `Admin ${user.name} queued action '${action}' for clinic node ${current.nodeId}`,
  });

  return { success: true, message: relayMessage || `Action '${action}' queued for execution on clinic node ${current.nodeId}.` };
}

export function resetClinicNodeState(): void {
  const store = getNodesStore();
  store.clear();
  clearAllLeases();
  store.set(DEFAULT_TELEMETRY.nodeId, { ...DEFAULT_TELEMETRY });
  (globalThis as any).__rad_suite_clinic_telemetry = { ...DEFAULT_TELEMETRY };
  try {
    if (fs.existsSync(PENDING_ACTIONS_FILE)) fs.unlinkSync(PENDING_ACTIONS_FILE);
    if (fs.existsSync(REGISTRY_FILE)) fs.unlinkSync(REGISTRY_FILE);
    if (fs.existsSync(DECOMMISSIONED_FILE)) fs.unlinkSync(DECOMMISSIONED_FILE);
  } catch {}
}
