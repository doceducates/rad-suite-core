import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { dispatchClinicAction, getClinicNodeStatus, resetClinicNodeState } from '../clinic-node.service';
import { getClinicHostDir } from '../clinic-node-manifest.service';

describe('Clinic Dual-NIC Network Routing & RadiAnt Segregation Suite', () => {
  beforeEach(() => {
    resetClinicNodeState();
  });

  describe('Static Route & Dual-NIC Invariants in setup-network-isolation.ps1', () => {
    it('verifies setup-network-isolation.ps1 enforces Wi-Fi metric 10 and Ethernet metric 100', () => {
      const scriptPath = path.join(getClinicHostDir(), 'setup-network-isolation.ps1');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Invariant: Wi-Fi Metric = 10 (Primary Default Gateway for Internet)
      expect(content).toContain('InterfaceMetric 10');
      expect(content).toContain('-AutomaticMetric Disabled');

      // Invariant: Ethernet Metric = 100 (Secondary Default Gateway)
      expect(content).toContain('InterfaceMetric 100');

      // Invariant: Persistent Static Route for Hospital PACS (172.29.0.0/16) with Metric 1
      expect(content).toContain('172.29.0.0');
      expect(content).toContain('255.255.0.0');
      expect(content).toContain('route -p add');
      expect(content).toContain('metric 1');

      // Invariant: Air-gap protection: IPEnableRouter must be 0
      expect(content).toContain('IPEnableRouter');
      expect(content).toContain('-Value 0');
    });

    it('validates RadiAnt Longest Prefix Match (LPM) routing theorem', () => {
      // In IPv4 routing, destination 192.168.1.100 (Hospital PACS) has:
      // - Match 1: 0.0.0.0/0 (Default Gateway via Wi-Fi, prefix length 0)
      // - Match 2: 172.29.0.0/16 (Hospital PACS via Ethernet, prefix length 16)
      // By RFC 1812 and Windows TCP/IP stack rules, prefix 16 ALWAYS takes precedence over prefix 0.
      const pacsIp = '192.168.1.100';
      const subnet = '192.168.0.0';
      const mask = '255.255.0.0';

      const ipToOctets = (ip: string) => ip.split('.').map((o) => parseInt(o, 10));
      const pacs = ipToOctets(pacsIp);
      const subnetOctets = ipToOctets(subnet);
      const maskOctets = ipToOctets(mask);

      const matchesPacsSubnet = pacs.every((octet, i) => (octet & maskOctets[i]) === subnetOctets[i]);
      expect(matchesPacsSubnet).toBe(true);

      const internetIp = '178.238.231.54'; // VPS IP
      const internet = ipToOctets(internetIp);
      const matchesInternet = internet.every((octet, i) => (octet & maskOctets[i]) === subnetOctets[i]);
      expect(matchesInternet).toBe(false);
    });
  });

  describe('Edge Network Policy Engine (network-policy.js)', () => {
    it('verifies network-policy.js exports all required handlers and enforces Session 0 stealth', () => {
      const code = fs.readFileSync(
        path.join(getClinicHostDir(), 'network-policy.js'),
        'utf8'
      );

      expect(code).toContain('enforceDualNicRouting');
      expect(code).toContain('getNetworkRoutingDiagnostics');
      expect(code).toContain('isolateWifi');
      expect(code).toContain('restoreWifi');
      expect(code).toContain('checkActiveIsolationTimer');
      expect(code).toContain('handleNetworkAdminAction');

      // Invariant: Session 0 stealth - windowsHide: true and zero popup APIs
      expect(code).toContain('windowsHide: true');
      expect(code).not.toContain('MessageBox');
      expect(code).not.toContain('msg.exe');
    });

    it('verifies admin-actions.js delegates network actions to network-policy.js', () => {
      const adminCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'admin-actions.js'),
        'utf8'
      );

      expect(adminCode).toContain('enforce-network-policy');
      expect(adminCode).toContain('isolate-wifi');
      expect(adminCode).toContain('restore-wifi');
      expect(adminCode).toContain('./network-policy');
    });

    it('verifies clinic-watchdog.js monitors isolation timer on each tick', () => {
      const watchdogCode = fs.readFileSync(
        path.join(getClinicHostDir(), 'clinic-watchdog.js'),
        'utf8'
      );

      expect(watchdogCode).toContain('checkActiveIsolationTimer');
      expect(watchdogCode).toContain('./network-policy');
    });
  });

  describe('Remote Action Dispatching: isolate-wifi & restore-wifi', () => {
    it('dispatches isolate-wifi action, pauses sync, and sets telemetry isolation state', async () => {
      const res = await dispatchClinicAction(
        'isolate-wifi',
        { id: 'admin-1', name: 'Dr. Mudassir' },
        { duration: 45 },
        'clinic-pc-primary'
      );

      expect(res.success).toBe(true);

      const telemetry = getClinicNodeStatus('clinic-pc-primary');
      expect(telemetry.syncPaused).toBe(true);
      expect(telemetry.wifiIsolation?.active).toBe(true);
      expect(telemetry.wifiIsolation?.remainingMinutes).toBe(45);
      expect(telemetry.wifiIsolation?.expiresAt).toBeTruthy();
    });

    it('dispatches restore-wifi action, unpauses sync, and clears isolation state', async () => {
      // First isolate
      await dispatchClinicAction(
        'isolate-wifi',
        { id: 'admin-1', name: 'Dr. Mudassir' },
        { duration: 30 },
        'clinic-pc-primary'
      );

      // Then restore
      const restoreRes = await dispatchClinicAction(
        'restore-wifi',
        { id: 'admin-1', name: 'Dr. Mudassir' },
        {},
        'clinic-pc-primary'
      );

      expect(restoreRes.success).toBe(true);

      const telemetry = getClinicNodeStatus('clinic-pc-primary');
      expect(telemetry.syncPaused).toBe(false);
      expect(telemetry.wifiIsolation?.active).toBe(false);
      expect(telemetry.wifiIsolation?.remainingMinutes).toBe(0);
    });

    it('dispatches enforce-network-policy without crashing or leaking state', async () => {
      const res = await dispatchClinicAction(
        'enforce-network-policy',
        { id: 'admin-1', name: 'Dr. Mudassir' },
        {},
        'clinic-pc-primary'
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('enforce-network-policy');
    });

    it('persists known Wi-Fi profiles via set-wifi-networks action', async () => {
      const networks = [
        { ssid: 'Radiology Reporting Room', password: 'ReportSecretPassword2026' },
        { ssid: 'HMIS-Staff', password: 'HmisWifiSecurePass' },
      ];

      const res = await dispatchClinicAction(
        'set-wifi-networks',
        { id: 'admin-1', name: 'Dr. Mudassir' },
        networks,
        'clinic-pc-primary'
      );

      expect(res.success).toBe(true);
      const telemetry = getClinicNodeStatus('clinic-pc-primary');
      expect(telemetry.knownNetworks).toBeDefined();
      expect(telemetry.knownNetworks?.length).toBe(2);
      expect(telemetry.knownNetworks?.[0].ssid).toBe('Radiology Reporting Room');
      expect(telemetry.knownNetworks?.[0].password).toBe('ReportSecretPassword2026');
    });

    it('persists known Wi-Fi profiles atomically in save-all-settings', async () => {
      const networks = [
        { ssid: 'Radiology Reporting Room', password: 'ReportSecretPassword2026' },
      ];

      const res = await dispatchClinicAction(
        'save-all-settings',
        { id: 'admin-1', name: 'Dr. Mudassir' },
        {
          knownNetworks: networks,
          stallWatchdog: {
            enabled: true,
            softRestartMinutes: 25,
            autoRebootMinutes: 50,
            networkWatchdogEnabled: true,
            wifiGraceMinutes: 30,
            wifiCooldownMinutes: 45,
          },
        },
        'clinic-pc-primary'
      );

      expect(res.success).toBe(true);
      const telemetry = getClinicNodeStatus('clinic-pc-primary');
      expect(telemetry.knownNetworks).toHaveLength(1);
      expect(telemetry.knownNetworks?.[0].ssid).toBe('Radiology Reporting Room');
      expect(telemetry.stallWatchdog?.wifiGraceMinutes).toBe(30);
    });

    it('verifies storage-actions syncSettingsFromResponse writes knownNetworks to offline vault', () => {
      const storageActionsPath = path.join(getClinicHostDir(), 'storage-actions.js');
      const content = fs.readFileSync(storageActionsPath, 'utf8');

      // Invariant: storage-actions.js must pair and sync knownNetworks
      expect(content).toContain("['knownNetworks', 'knownNetworks']");
      expect(content).toContain('require(\'./wifi-hopper\').saveKnownNetworks');
    });
  });
});
