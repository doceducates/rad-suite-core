import fs from 'fs';
import path from 'path';
import type { ClinicNodeTelemetry } from './clinic-node.types';

const isTest = process.env.NODE_ENV === 'test';
const poolId = process.env.VITEST_POOL_ID || process.env.VITEST_WORKER_ID || '0';
export const PENDING_ACTIONS_FILE = path.join(process.cwd(), isTest ? `.test_clinic_pending_actions_${poolId}.json` : '.clinic_pending_actions.json');
export const REGISTRY_FILE = path.join(process.cwd(), isTest ? `.test_clinic_nodes_registry_${poolId}.json` : '.clinic_nodes_registry.json');
export const DECOMMISSIONED_FILE = path.join(process.cwd(), isTest ? `.test_clinic_decommissioned_${poolId}.json` : '.clinic_decommissioned.json');

export function readDecommissionedNodes(): string[] {
  try {
    if (fs.existsSync(DECOMMISSIONED_FILE)) return JSON.parse(fs.readFileSync(DECOMMISSIONED_FILE, 'utf8'));
  } catch {}
  return [];
}

export function markNodeDecommissioned(nodeId: string): void {
  try {
    const list = new Set(readDecommissionedNodes());
    list.add(nodeId);
    fs.writeFileSync(DECOMMISSIONED_FILE, JSON.stringify(Array.from(list)), 'utf8');
  } catch {}
}

export function clearNodeDecommissioned(nodeId: string): void {
  try {
    const list = new Set(readDecommissionedNodes());
    if (list.delete(nodeId)) {
      fs.writeFileSync(DECOMMISSIONED_FILE, JSON.stringify(Array.from(list)), 'utf8');
    }
  } catch {}
}

export function isNodeDecommissioned(nodeId: string): boolean {
  return readDecommissionedNodes().includes(nodeId);
}

export const DEFAULT_CLINIC_WIFI_NETWORKS: Array<{ ssid: string; password?: string }> = (() => {
  try {
    if (process.env.CLINIC_WIFI_NETWORKS) {
      return JSON.parse(process.env.CLINIC_WIFI_NETWORKS);
    }
  } catch {}
  return [];
})();

export const DEFAULT_TELEMETRY: ClinicNodeTelemetry = {
  nodeId: 'clinic-pc-primary',
  name: 'Primary Workstation',
  hostname: 'DESKTOP-GGDLRT9',
  online: false,
  orthancStatus: 'stopped',
  disk: { totalGb: 512, usedGb: 142, freeGb: 370, usedPercent: 28, maxStorageSizeGb: 100 },
  casesToday: 0,
  targetCases: 50,
  instancesToday: 0,
  syncedStudies: [],
  activeDownload: null,
  downloadQueue: [],
  activeUpload: null,
  uploadQueue: [],
  lastHeartbeat: null,
  pendingAction: null,
  syncPaused: false,
  schedule: null,
  diagnostics: null,
  compression: { enabled: true, method: 'jpeg2000_lossless' },
  heartbeatIntervalMs: 5000,
  autoRetention: { enabled: false, ageDays: 3 },
  stallWatchdog: {
    enabled: true,
    softRestartMinutes: 20,
    autoRebootMinutes: 40,
    maxRebootsPerDay: 2,
    requireNetworkProbe: true,
    networkWatchdogEnabled: true,
    wifiGraceMinutes: 45,
    wifiCooldownMinutes: 60,
    offlineRebootMinutes: 180,
  },
  peerCooperation: { enabled: true, leaseTtlMinutes: 15 },
  syncRules: {
    allowedModalities: ['MR'],
    descriptionKeywords: ['spine', 'cervical', 'dorsal', 'thoracic', 'lumbar', 'lumbosacral', 'ls', 'lss', 'cs', 'css', 'ds', 'dss', 'dl'],
    bypassKeywords: false,
    syncMode: 'auto_filtered',
  },
  harvestSchedule: {
    enabled: true,
    intervalMinutes: 10,
    concurrency: 1,
    modalities: ['MR'],
    scope: 'today',
    bypassKeywords: false,
  },
  localStudies: [],
  inventorySummary: null,
  knownNetworks: DEFAULT_CLINIC_WIFI_NETWORKS,
};

export function readRegistryDisk(): Record<string, { name?: string; hostname?: string }> {
  try {
    if (fs.existsSync(REGISTRY_FILE)) return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch {}
  return {};
}

export function writeRegistryDisk(store: Map<string, ClinicNodeTelemetry>): void {
  try {
    const meta: Record<string, { name?: string; hostname?: string }> = {};
    for (const [id, node] of store.entries()) {
      meta[id] = { name: node.name, hostname: node.hostname };
    }
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch {}
}

export function getNodesStore(): Map<string, ClinicNodeTelemetry> {
  if (!(globalThis as any).__rad_suite_clinic_nodes) {
    const map = new Map<string, ClinicNodeTelemetry>();
    const diskMeta = readRegistryDisk();
    const diskKeys = Object.keys(diskMeta);

    if (diskKeys.length > 0) {
      for (const [id, meta] of Object.entries(diskMeta)) {
        if (!isNodeDecommissioned(id)) {
          map.set(id, {
            ...DEFAULT_TELEMETRY,
            nodeId: id,
            name: meta.name || id,
            hostname: meta.hostname || '',
          });
        }
      }
    } else {
      map.set(DEFAULT_TELEMETRY.nodeId, { ...DEFAULT_TELEMETRY });
    }
    (globalThis as any).__rad_suite_clinic_nodes = map;
  }
  const store = (globalThis as any).__rad_suite_clinic_nodes as Map<string, ClinicNodeTelemetry>;
  const decommissioned = readDecommissionedNodes();
  for (const id of decommissioned) {
    store.delete(id);
  }
  return store;
}

export function readPendingActionDisk(nodeId: string): string | null {
  try {
    if (fs.existsSync(PENDING_ACTIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PENDING_ACTIONS_FILE, 'utf8'));
      return data[nodeId] || null;
    }
  } catch {}
  return null;
}

export function writePendingActionDisk(nodeId: string, action: string | null): void {
  try {
    let data: Record<string, string> = {};
    if (fs.existsSync(PENDING_ACTIONS_FILE)) {
      try { data = JSON.parse(fs.readFileSync(PENDING_ACTIONS_FILE, 'utf8')); } catch {}
    }
    if (action) { data[nodeId] = action; } else { delete data[nodeId]; }
    fs.writeFileSync(PENDING_ACTIONS_FILE, JSON.stringify(data), 'utf8');
  } catch {}
}
