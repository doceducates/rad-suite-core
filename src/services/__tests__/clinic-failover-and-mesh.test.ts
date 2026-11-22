import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordClinicHeartbeat,
  getClinicNodeStatus,
  getNodesStore,
} from '../clinic-node.service';
import { clearAllLeases } from '../clinic-lease.service';
import type { ClinicNodeTelemetry } from '../clinic-node.types';

describe('Clinic Node HA Failover & LAN Peer Mesh Contracts', () => {
  beforeEach(() => {
    const store = getNodesStore();
    store.clear();
    clearAllLeases();
  });

  it('promotes secondary node to primary harvester when primary heartbeat expires (> 150s)', () => {
    const store = getNodesStore();

    // Primary node A registered earlier, but last heartbeat was 3 minutes (180s) ago
    const expiredTime = new Date(Date.now() - 180000).toISOString();
    store.set('node-primary-pc', {
      nodeId: 'node-primary-pc',
      name: 'Primary Workstation',
      hostname: 'DESKTOP-PRIMARY',
      lanIp: '192.168.0.101',
      online: false,
      lastHeartbeat: expiredTime,
      harvestSchedule: { enabled: true, intervalMinutes: 10, modalities: ['MR'], bypassKeywords: false },
      peerCooperation: { enabled: true, autoFailover: true, peerMeshRelay: true },
    } as ClinicNodeTelemetry);

    // Secondary node B sends heartbeat now
    const heartbeatB = recordClinicHeartbeat({
      nodeId: 'node-secondary-pc',
      name: 'Secondary Workstation',
      hostname: 'DESKTOP-SECONDARY',
      lanIp: '192.168.0.102',
      peerCooperation: { enabled: true, autoFailover: true, peerMeshRelay: true },
      harvestSchedule: { enabled: false, intervalMinutes: 10, modalities: ['MR'], bypassKeywords: false },
    });

    expect(heartbeatB.success).toBe(true);

    // Check that Secondary node B was promoted
    const statusB = getClinicNodeStatus('node-secondary-pc');
    expect(statusB.harvestSchedule?.enabled).toBe(true);
  });

  it('gracefully demotes returning primary if another node has assumed leadership', () => {
    const store = getNodesStore();

    // Node B is currently active and healthy Primary (< 30s ago)
    const recentTime = new Date(Date.now() - 25000).toISOString();
    store.set('node-secondary-pc', {
      nodeId: 'node-secondary-pc',
      name: 'Secondary Workstation',
      hostname: 'DESKTOP-SECONDARY',
      lanIp: '192.168.0.102',
      online: true,
      lastHeartbeat: recentTime,
      harvestSchedule: { enabled: true, intervalMinutes: 10, modalities: ['MR'], bypassKeywords: false },
      peerCooperation: { enabled: true, autoFailover: true },
    } as ClinicNodeTelemetry);

    // Former primary node A comes back online and heartbeats with enabled: true
    const heartbeatA = recordClinicHeartbeat({
      nodeId: 'node-primary-pc',
      name: 'Primary Workstation',
      hostname: 'DESKTOP-PRIMARY',
      lanIp: '192.168.0.101',
      peerCooperation: { enabled: true, autoFailover: true },
      harvestSchedule: { enabled: true, intervalMinutes: 10, modalities: ['MR'], bypassKeywords: false },
    });

    expect(heartbeatA.success).toBe(true);

    // Former primary should be gracefully demoted to avoid split-brain
    const statusA = getClinicNodeStatus('node-primary-pc');
    expect(statusA.harvestSchedule?.enabled).toBe(false);
  });

  it('returns active peer nodes in heartbeat response excluding self', () => {
    const store = getNodesStore();

    const recentTime = new Date(Date.now() - 10000).toISOString();
    store.set('node-peer-1', {
      nodeId: 'node-peer-1',
      name: 'Peer Console 1',
      hostname: 'DESKTOP-PC1',
      lanIp: '192.168.0.105',
      online: true,
      lastHeartbeat: recentTime,
      harvestSchedule: { enabled: true, intervalMinutes: 10, modalities: ['MR'], bypassKeywords: false },
    } as ClinicNodeTelemetry);

    const res = recordClinicHeartbeat({
      nodeId: 'node-peer-2',
      name: 'Peer Console 2',
      hostname: 'DESKTOP-PC2',
      lanIp: '192.168.0.106',
    });

    expect(res.success).toBe(true);
    const peerNodes = (res as any).peerNodes;
    expect(Array.isArray(peerNodes)).toBe(true);
    expect(peerNodes.length).toBe(1);
    expect(peerNodes[0].nodeId).toBe('node-peer-1');
    expect(peerNodes[0].lanIp).toBe('192.168.0.105');
    expect(peerNodes[0].orthancHttpPort).toBe(18042);
    expect(peerNodes[0].isPrimaryHarvester).toBe(true);
  });
});
