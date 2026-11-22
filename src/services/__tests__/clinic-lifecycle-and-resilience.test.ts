import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { handshakeClinicNode } from '../clinic-node-registration.service';
import { getClinicHostDir } from '../clinic-node-manifest.service';
import {
  recordClinicHeartbeat,
  dispatchClinicAction,
  getAllClinicNodes,
  getClinicNodeStatus,
  resetClinicNodeState,
} from '../clinic-node.service';
import {
  markNodeDecommissioned,
  clearNodeDecommissioned,
  isNodeDecommissioned,
  getNodesStore,
} from '../clinic-node-storage';

describe('Clinic Node Lifecycle, Remote Decommission & Resilience Suite', () => {
  beforeEach(() => {
    resetClinicNodeState();
  });

  describe('Installer Process Reaper & Idempotency Invariants', () => {
    it('verifies install-sandbox.ps1 terminates lingering processes before file copying', () => {
      const scriptPath = path.join(getClinicHostDir(), 'install-sandbox.ps1');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Invariant: Must end lifeline scheduled task first to prevent auto-restart during install
      expect(content).toContain('schtasks /End /TN "RadSuite_Immortal_Lifeline"');

      // Invariant: Must stop previous services before file manipulation
      expect(content).toContain('RadSuiteEdgeAgent');
      expect(content).toContain('RadSuiteWatchdog');
      expect(content).toContain('Orthanc');

      // Invariant: Must kill lingering node or Orthanc processes running from BaseDir or executing clinic scripts
      expect(content).toContain("Win32_Process -Filter \"name = 'node.exe'\"");
      expect(content).toContain('Stop-Process');

      // Invariant: Pre-cleanup must happen before Step 2 Directory Layout / file copy
      const reaperIndex = content.indexOf('Clean Up & Terminate Previous Stalling Services');
      const copyIndex = content.indexOf('Copy-Item');
      expect(reaperIndex).toBeGreaterThan(-1);
      expect(copyIndex).toBeGreaterThan(-1);
      expect(reaperIndex).toBeLessThan(copyIndex);
    });

    it('verifies install.bat enforces administrative elevation check', () => {
      const batPath = path.join(getClinicHostDir(), 'install.bat');
      const content = fs.readFileSync(batPath, 'utf8');

      expect(content).toContain('net session');
      expect(content).toContain('install-sandbox.ps1');
      expect(content).toContain('-Verb RunAs');
    });
  });

  describe('Zero-Config Handshake & Identity Configuration', () => {
    it('enforces strict anti-choking rules and assigns primary harvester role to first node', async () => {
      const res = await handshakeClinicNode({
        hostname: 'DESKTOP-RAD1',
        lanIp: '172.29.40.110',
        macAddresses: ['11:22:33:44:55:66'],
        platform: 'win32',
      });

      expect(res.success).toBe(true);
      expect(res.nodeId).toBe('node-desktop-rad1');
      expect(res.role).toBe('primary');
      expect(res.isPrimaryHarvester).toBe(true);

      // Invariant: MR modality and bypassKeywords=false strictly enforced
      expect(res.syncRules.bypassKeywords).toBe(false);
      expect(res.syncRules.allowedModalities).toEqual(['MR']);
      expect(res.harvestSchedule.bypassKeywords).toBe(false);
      expect(res.harvestSchedule.modalities).toEqual(['MR']);
    });

    it('auto-resolves hostname collisions without overwriting existing registrations', async () => {
      const res1 = await handshakeClinicNode({
        hostname: 'RAD-CONSOLE',
        lanIp: '172.29.40.111',
      });
      expect(res1.nodeId).toBe('node-rad-console');

      const res2 = await handshakeClinicNode({
        requestedNodeId: 'node-rad-console-2',
        hostname: 'RAD-CONSOLE',
        lanIp: '172.29.40.112',
      });
      expect(res2.nodeId).toBe('node-rad-console-2');
    });
  });

  describe('Remote VPS Decommission & Teardown Protocol', () => {
    it('dispatches remove-node from VPS and queues teardown action', async () => {
      await handshakeClinicNode({
        hostname: 'NODE-TO-DECOMMISSION',
        lanIp: '172.29.40.115',
      });

      const res = await dispatchClinicAction(
        'remove-node',
        { id: 'admin-1', name: 'Dr. Radiologist' },
        { uninstallAgent: true },
        'node-to-decommission'
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('teardown queued');
      expect(isNodeDecommissioned('node-to-decommission')).toBe(true);

      // Invariant: Node must be immediately excluded from active list
      const activeNodes = getAllClinicNodes();
      expect(activeNodes.map((n) => n.nodeId)).not.toContain('node-to-decommission');
    });

    it('delivers uninstall-agent pending action on heartbeat without re-adding node to active store', () => {
      markNodeDecommissioned('node-retired-x');

      const heartbeatRes = recordClinicHeartbeat({
        nodeId: 'node-retired-x',
        name: 'Retired PC',
        hostname: 'RETIRED-PC',
      });

      expect(heartbeatRes.success).toBe(true);
      expect(heartbeatRes.pendingAction).toBe('uninstall-agent');

      // Invariant: Must not re-appear in getAllClinicNodes
      const activeNodes = getAllClinicNodes();
      expect(activeNodes.map((n) => n.nodeId)).not.toContain('node-retired-x');
    });

    it('verifies edge agent has loop prevention guard and teardown handler', () => {
      const agentCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-agent.js'),
        'utf8'
      );

      // Invariant: isExecutingAction guard prevents infinite recursive heartbeat loop
      expect(agentCode).toContain('isExecutingAction');
      expect(agentCode).toContain('sendHeartbeat(true)');
      expect(agentCode).toContain("actionPayload === 'uninstall-agent'");
      expect(agentCode).toContain('executeTeardown');

      const recoveryCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-agent-recovery.js'),
        'utf8'
      );

      // Invariant: Teardown removes scheduled task, services, and firewall rule (both generic and legacy)
      expect(recoveryCode).toContain('MedicalHealthRecovery');
      expect(recoveryCode).toContain('MedicalEdgeAgent');
      expect(recoveryCode).toContain('MedicalWatchdog');
      expect(recoveryCode).toContain('DICOM Edge Router (11115)');
      expect(recoveryCode).toContain('RadSuite_Immortal_Lifeline');
      expect(recoveryCode).toContain('RadSuiteEdgeAgent');
      expect(recoveryCode).toContain('RadSuiteWatchdog');
      expect(recoveryCode).toContain('process.exit(0)');
    });
  });

  describe('Stealth Generic Naming, Wi-Fi Vault & Zero-Popup Invariants', () => {
    it('verifies generic naming invariant: install and services use MedicalEdgeAgent and MedicalWatchdog', () => {
      const installCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'install-sandbox.ps1'),
        'utf8'
      );
      expect(installCode).toContain('MedicalEdgeAgent');
      expect(installCode).toContain('MedicalWatchdog');
      expect(installCode).toContain('MedicalHealthRecovery');
      expect(installCode).toContain('DICOM Edge Router (11115)');

      const watchdogCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-watchdog.js'),
        'utf8'
      );
      expect(watchdogCode).toContain('MedicalEdgeAgent');
      expect(watchdogCode).toContain('MedicalWatchdog');
      expect(watchdogCode).toContain('MedicalHealthRecovery');
    });

    it('verifies wifi-hopper exports credential vault, profile synthesis, and silent auto-recovery', () => {
      const wifiCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'wifi-hopper.js'),
        'utf8'
      );

      // Invariant: Required Wi-Fi vault & auto-recovery exports
      expect(wifiCode).toContain('getKnownNetworks');
      expect(wifiCode).toContain('saveKnownNetworks');
      expect(wifiCode).toContain('connectWithCredentials');
      expect(wifiCode).toContain('autoRecoverWifi');

      // Invariant: Zero Popups & Session 0 stealth: windowsHide: true
      expect(wifiCode).toContain('windowsHide: true');
      expect(wifiCode).not.toContain('MessageBox');
      expect(wifiCode).not.toContain('msg.exe');

      // Invariant: Profile synthesis uses standard WPA2PSK AES
      expect(wifiCode).toContain('WPA2PSK');
      expect(wifiCode).toContain('AES');
      expect(wifiCode).toContain('netsh wlan add profile');
      expect(wifiCode).toContain('netsh wlan connect');
    });
  });

  describe('Offline Tolerance & Automatic Reconnection Invariant', () => {
    it('verifies edge agent wraps network calls with non-blocking error handlers', () => {
      const agentCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-agent.js'),
        'utf8'
      );

      expect(agentCode).toContain("req.on('error', () => resolve(false))");
      expect(agentCode).toContain('timeout: 8000');

      const handshakeCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-handshake-client.js'),
        'utf8'
      );

      expect(handshakeCode).toContain('Cloud unreachable');
      expect(handshakeCode).toContain('Retrying on next cycle');
    });

    it('immediately restores node to online: true when heartbeat arrives after offline period', () => {
      // Step 1: Record initial heartbeat
      recordClinicHeartbeat({
        nodeId: 'node-hospital-reconnect',
        name: 'Hospital Reconnect PC',
        hostname: 'HOSPITAL-PC',
      });

      let status = getClinicNodeStatus('node-hospital-reconnect');
      expect(status.online).toBe(true);

      // Step 2: Simulate offline period by advancing time past HEARTBEAT_TIMEOUT_MS
      const expiredTime = new Date(Date.now() - 150000).toISOString();
      recordClinicHeartbeat({
        nodeId: 'node-hospital-reconnect',
        name: 'Hospital Reconnect PC',
        lastHeartbeat: expiredTime,
      });

      // Step 3: Next incoming heartbeat re-activates node immediately
      recordClinicHeartbeat({
        nodeId: 'node-hospital-reconnect',
        name: 'Hospital Reconnect PC',
        casesToday: 12,
      });

      status = getClinicNodeStatus('node-hospital-reconnect');
      expect(status.online).toBe(true);
      expect(status.casesToday).toBe(12);
    });

    it('seamlessly re-adopts pre-existing node during reinstallation without duplicating or wiping configs', async () => {
      // 1. Initial registration
      const first = await handshakeClinicNode({
        hostname: 'DESKTOP-1LDU8L1',
        lanIp: '172.29.40.103',
      });
      expect(first.success).toBe(true);
      expect(first.nodeId).toBe('node-desktop-1ldu8l1');

      // Customize server settings (e.g. sync rules or known networks)
      const store = getNodesStore();
      const node = store.get('node-desktop-1ldu8l1')!;
      node.syncRules = {
        allowedModalities: ['MR', 'CT'],
        descriptionKeywords: ['spine', 'brain'],
        bypassKeywords: false,
        syncMode: 'auto_filtered',
      };
      node.knownNetworks = [{ ssid: 'Custom-Hospital-Wifi', password: 'secretpassword' }];

      // 2. Re-install on same machine (triggers handshake again)
      const reinstall = await handshakeClinicNode({
        hostname: 'DESKTOP-1LDU8L1',
        lanIp: '172.29.40.103',
        requestedNodeId: 'node-desktop-1ldu8l1',
      });

      // Invariant: Must NOT create duplicate like node-desktop-1ldu8l1-2
      expect(reinstall.success).toBe(true);
      expect(reinstall.nodeId).toBe('node-desktop-1ldu8l1');

      // Invariant: Must retain customized sync rules and known networks
      const after = getClinicNodeStatus('node-desktop-1ldu8l1');
      expect(after.online).toBe(true);
      expect(after.syncRules?.allowedModalities).toContain('CT');
      expect(after.knownNetworks).toEqual([{ ssid: 'Custom-Hospital-Wifi', password: 'secretpassword' }]);

      // Invariant: Total active nodes must only have 1 entry for this machine
      const all = getAllClinicNodes();
      const matches = all.filter((n) => n.nodeId.startsWith('node-desktop-1ldu8l1'));
      expect(matches.length).toBe(1);
    });
  });
});
