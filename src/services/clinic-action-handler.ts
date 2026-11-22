import type { ClinicNodeTelemetry, ClinicActionType } from './clinic-node.types';

/**
 * Applies administrative mutations and edge configuration updates to a node telemetry record.
 */
export function applyClinicActionSettings(
  current: ClinicNodeTelemetry,
  action: ClinicActionType,
  payload: any
): void {
  if (action === 'rename-node') {
    const newName = typeof payload === 'string' ? payload.trim() : (payload?.name || '').trim();
    if (newName) current.name = newName;
  } else if (action === 'set-disk-cap') {
    const gb = typeof payload === 'number' ? payload : Number(payload?.gb) || 100;
    current.disk = { ...current.disk, maxStorageSizeGb: gb };
  } else if (action === 'set-auto-retention') {
    current.autoRetention = {
      enabled: Boolean(payload?.enabled),
      ageDays: Number(payload?.ageDays ?? 3),
    };
  } else if (action === 'set-heartbeat-interval') {
    const ms = typeof payload === 'number' ? payload : Number(payload?.ms) || 5000;
    current.heartbeatIntervalMs = ms;
  } else if (action === 'set-compression') {
    const method = typeof payload === 'string' ? payload : (payload?.method || 'jpeg2000_lossless');
    current.compression = { enabled: method !== 'original', method };
  } else if (action === 'set-sync-rules') {
    current.syncRules = payload;
  } else if (action === 'set-schedule') {
    current.schedule = payload;
  } else if (action === 'set-harvest-schedule') {
    current.harvestSchedule = payload;
  } else if (action === 'pause-sync') {
    current.syncPaused = true;
  } else if (action === 'resume-sync') {
    current.syncPaused = false;
  } else if (action === 'set-stall-watchdog') {
    current.stallWatchdog = payload;
  } else if (action === 'set-peer-cooperation') {
    current.peerCooperation = payload;
  } else if (action === 'uninstall-agent') {
    current.orthancStatus = 'stopped';
    current.online = false;
    current.status = 'uninstalled';
  } else if (action === 'set-wifi-networks') {
    (current as any).knownNetworks = Array.isArray(payload) ? payload : (payload?.networks || []);
  } else if (action === 'isolate-wifi') {
    const duration = typeof payload === 'number' ? payload : (payload?.duration || payload?.minutes || 30);
    const expiresAt = new Date(Date.now() + duration * 60000).toISOString();
    current.wifiIsolation = { active: true, remainingMinutes: duration, expiresAt };
    current.syncPaused = true;
  } else if (action === 'restore-wifi') {
    current.wifiIsolation = { active: false, remainingMinutes: 0, expiresAt: null };
    current.syncPaused = false;
  } else if (action === 'save-all-settings') {
    if (payload?.knownNetworks) (current as any).knownNetworks = payload.knownNetworks;
    if (payload?.harvestSchedule) current.harvestSchedule = payload.harvestSchedule;
    if (payload?.syncRules) current.syncRules = payload.syncRules;
    if (payload?.stallWatchdog) current.stallWatchdog = payload.stallWatchdog;
    if (payload?.peerCooperation) current.peerCooperation = payload.peerCooperation;
    if (payload?.schedule) current.schedule = payload.schedule;
    if (payload?.autoRetention) current.autoRetention = payload.autoRetention;
    if (payload?.disk?.maxStorageSizeGb) {
      current.disk = { ...current.disk, maxStorageSizeGb: Number(payload.disk.maxStorageSizeGb) };
    }
  }
}
