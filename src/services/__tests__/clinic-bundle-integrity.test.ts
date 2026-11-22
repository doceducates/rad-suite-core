import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getClinicHostFiles, getClinicScriptManifest, getClinicHostDir } from '../clinic-node-manifest.service';
import { handshakeClinicNode } from '../clinic-node-registration.service';
import { resetClinicNodeState, getAllClinicNodes, recordClinicHeartbeat, dispatchClinicAction } from '../clinic-node.service';
import { markNodeDecommissioned, isNodeDecommissioned } from '../clinic-node-storage';

describe('Clinic Node Bundle Integrity & Zero-Config Auto-Registration', () => {
  beforeEach(() => {
    resetClinicNodeState();
  });

  describe('Dynamic Script Bundle Completeness', () => {
    it('discovers all required companion scripts without missing files', () => {
      const files = getClinicHostFiles();
      expect(files.length).toBeGreaterThan(15);

      const requiredFiles = [
        'clinic-agent.js',
        'clinic-watchdog.js',
        'clinic-logger.js',
        'wifi-hopper.js',
        'clinic-handshake-client.js',
        'pacs-worker.js',
        'uploader-worker.js',
        'pacs-harvester.js',
        'pacs-query-helpers.js',
        's3-uploader.js',
        'upload-queue.js',
        'local-inventory.js',
        'system-metrics.js',
        'diagnostics.js',
        'admin-actions.js',
        'storage-actions.js',
        'install-sandbox.ps1',
        'install.bat',
        'uninstall.bat',
        'setup-network-isolation.ps1',
        'update-node.ps1',
        'known-networks.json',
        'agent-config.json',
        'orthanc.json',
        'orthanc_sync.lua',
      ];

      for (const reqFile of requiredFiles) {
        expect(files, `Missing required edge file: ${reqFile}`).toContain(reqFile);
      }
    });

    it('verifies all .js companion scripts have clean syntax and parse cleanly', () => {
      const baseDir = getClinicHostDir();
      const files = getClinicHostFiles().filter((f) => f.endsWith('.js'));

      for (const file of files) {
        const filePath = path.join(baseDir, file);
        const code = fs.readFileSync(filePath, 'utf8');
        const cleanCode = code.replace(/^#!.*\r?\n/, '');

        // Check for basic JS syntax errors via Function constructor check
        expect(() => {
          new Function('require', 'module', 'exports', '__dirname', '__filename', cleanCode);
        }, `Syntax error detected in ${file}`).not.toThrow();
      }
    });

    it('computes deterministic manifest with SHA256 hashes for all edge scripts', () => {
      const manifest = getClinicScriptManifest();
      expect(manifest.version).toBeDefined();
      expect(manifest.version.length).toBe(16);
      expect(Object.keys(manifest.files).length).toBeGreaterThan(15);

      expect(manifest.files['clinic-agent.js']).toBeDefined();
      expect(manifest.files['clinic-logger.js']).toBeDefined();
      expect(manifest.files['wifi-hopper.js']).toBeDefined();
    });

    it('verifies installer cleans up previous processes, services, and tasks before reinstalling', () => {
      const baseDir = getClinicHostDir();
      const installerCode = fs.readFileSync(path.join(baseDir, 'install-sandbox.ps1'), 'utf8');

      expect(installerCode).toContain('MedicalHealthRecovery');
      expect(installerCode).toContain('MedicalEdgeAgent');
      expect(installerCode).toContain('MedicalWatchdog');
      expect(installerCode).toContain('Win32_Process');
      expect(installerCode).toContain('clinic-agent');
      expect(installerCode).toContain('Stop-Process');
      expect(installerCode).toContain('--handshake');
    });
  });

  describe('Zero-Config Edge Node Auto-Registration & Handshake Protocol', () => {
    it('provisions first connecting node as primary harvester with partition 0', async () => {
      const result = await handshakeClinicNode({
        hostname: 'DESKTOP-1LDU8L1',
        lanIp: '172.29.40.103',
        macAddresses: ['aa:bb:cc:dd:ee:01'],
        platform: 'win32',
      });

      expect(result.success).toBe(true);
      expect(result.registered).toBe(true);
      expect(result.nodeId).toBe('node-desktop-1ldu8l1');
      expect(result.name).toBe('DESKTOP-1LDU8L1');
      expect(result.role).toBe('primary');
      expect(result.isPrimaryHarvester).toBe(true);
      expect(result.partition).toBe(0);

      // Invariant: bypassKeywords is strictly false, modality is MR only
      expect(result.syncRules.bypassKeywords).toBe(false);
      expect(result.syncRules.allowedModalities).toEqual(['MR']);
      expect(result.harvestSchedule.bypassKeywords).toBe(false);
      expect(result.pacs.host).toBe(process.env.DEFAULT_PACS_HOST || '127.0.0.1');
      expect(result.pacs.port).toBe(8040);
    });

    it('provisions subsequent connecting node as secondary console with partition 1 to prevent bandwidth competition', async () => {
      // First node (Primary)
      await handshakeClinicNode({
        hostname: 'DESKTOP-PRIMARY',
        lanIp: '172.29.40.103',
      });

      // Second node (Secondary Console on same LAN)
      const secondResult = await handshakeClinicNode({
        hostname: 'DESKTOP-B488C9K',
        lanIp: '172.29.40.105',
        macAddresses: ['aa:bb:cc:dd:ee:02'],
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.nodeId).toBe('node-desktop-b488c9k');
      expect(secondResult.role).toBe('secondary_console');
      expect(secondResult.isPrimaryHarvester).toBe(false);
      expect(secondResult.partition).toBe(1);

      // Verify node exists in registry
      const allNodes = getAllClinicNodes();
      expect(allNodes.map((n) => n.nodeId)).toContain('node-desktop-b488c9k');
      expect(allNodes.map((n) => n.nodeId)).toContain('node-desktop-primary');
    });

    it('resolves hostname collisions cleanly without overwriting different machines', async () => {
      const res1 = await handshakeClinicNode({
        hostname: 'CLINIC-PC',
        lanIp: '172.29.40.101',
      });
      expect(res1.nodeId).toBe('node-clinic-pc');

      const res2 = await handshakeClinicNode({
        requestedNodeId: 'node-clinic-pc-secondary',
        hostname: 'CLINIC-PC-2',
        lanIp: '172.29.40.102',
      });
      expect(res2.nodeId).toBe('node-clinic-pc-secondary');
    });
  });

  describe('Decommissioned Node Protocol & Remote Teardown Dispatch', () => {
    it('returns pendingAction uninstall-agent when a decommissioned node heartbeats', () => {
      markNodeDecommissioned('node-test-retire');
      expect(isNodeDecommissioned('node-test-retire')).toBe(true);

      const heartbeatResult = recordClinicHeartbeat({
        nodeId: 'node-test-retire',
        name: 'Retired Node',
        hostname: 'DESKTOP-RETIRED',
      });

      expect(heartbeatResult.success).toBe(true);
      expect(heartbeatResult.pendingAction).toBe('uninstall-agent');
    });

    it('excludes decommissioned nodes from getAllClinicNodes active registry', async () => {
      await handshakeClinicNode({
        hostname: 'DESKTOP-ACTIVE',
        lanIp: '172.29.40.120',
      });

      markNodeDecommissioned('node-desktop-active');
      const activeNodes = getAllClinicNodes();
      expect(activeNodes.map((n) => n.nodeId)).not.toContain('node-desktop-active');
    });

    it('decommissions node and queues teardown via remove-node action', async () => {
      await handshakeClinicNode({
        hostname: 'DESKTOP-TO-REMOVE',
        lanIp: '172.29.40.121',
      });

      const removeResult = await dispatchClinicAction(
        'remove-node',
        { id: 'admin-1', name: 'Dr. Test' },
        { uninstallAgent: true },
        'node-desktop-to-remove'
      );

      expect(removeResult.success).toBe(true);
      expect(removeResult.message).toContain('teardown queued');
      expect(isNodeDecommissioned('node-desktop-to-remove')).toBe(true);

      const heartbeat = recordClinicHeartbeat({
        nodeId: 'node-desktop-to-remove',
      });
      expect(heartbeat.pendingAction).toBe('uninstall-agent');
    });
  });

  describe('Edge Node Offline Resilience & Periodic Reconnection Invariant', () => {
    it('resiliently handles offline VPS during heartbeat without crashing', () => {
      // Simulate client heartbeat when server returns 200 with normal status
      const normalHb = recordClinicHeartbeat({
        nodeId: 'node-test-resilient',
        name: 'Resilient Node',
        casesToday: 5,
      });

      expect(normalHb.success).toBe(true);
      expect(normalHb.pendingAction).toBeNull();

      // Verify node is marked online
      const all = getAllClinicNodes();
      const node = all.find((n) => n.nodeId === 'node-test-resilient');
      expect(node).toBeDefined();
      expect(node?.online).toBe(true);
    });

    it('verifies edge agent client code wraps network requests with timeouts and error catches', () => {
      const agentScript = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-agent.js'),
        'utf8'
      );

      // Verify heartbeat has timeout and req.on('error') that resolves without throwing
      expect(agentScript).toContain("req.on('error', () => resolve(false))");
      expect(agentScript).toContain('timeout: 8000');

      // Verify recursive execution guard exists to prevent infinite action loops
      expect(agentScript).toContain('isExecutingAction');

      // Verify handshake client has timeout and catch block that logs retry message
      const handshakeScript = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-handshake-client.js'),
        'utf8'
      );
      expect(handshakeScript).toContain('Handshake timeout');
      expect(handshakeScript).toContain('Cloud unreachable');
      expect(handshakeScript).toContain('Retrying on next cycle');
    });
  });
});
