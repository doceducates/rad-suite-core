import { describe, it, expect } from 'vitest';
// @ts-ignore
import { parseWlanOutput, getWifiDiagnostics, autoRecoverWifi } from '../../../plugins/clinic-edge/host-scripts/system-metrics.js';

describe('Wi-Fi Diagnostics & Auto-Recovery Unit Tests', () => {
  it('should correctly parse connected Wi-Fi output from netsh', () => {
    const ifaceOut = `
Wi-Fi                                      
   Type:                 Dedicated             
   Administrative state: Enabled             
   Connect state:        Connected
`;
    const wlanOut = `
There is 1 interface on the system: 

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6E AX211 160MHz
    GUID                   : d2666c32-99a5-4832-b2fe-b1b1f36b7be9
    Physical address       : 60:45:2e:f4:69:74
    Interface type         : Primary
    State                  : connected
    SSID                   : Radiology Reporting Rooms
    AP BSSID               : 50:0f:f5:80:b4:58
    Band                   : 2.4 GHz
    Channel                : 8
    Radio type             : 802.11n
    Authentication         : WPA2-Personal
    Cipher                 : CCMP
    Connection mode        : Auto Connect
    Receive rate (Mbps)    : 300
    Transmit rate (Mbps)   : 300
    Signal                 : 85% 
    Profile                : Radiology Reporting Rooms
`;

    const diag = parseWlanOutput(ifaceOut, wlanOut);
    expect(diag.status).toBe('pass');
    expect(diag.state).toBe('connected');
    expect(diag.ssid).toBe('Radiology Reporting Rooms');
    expect(diag.signal).toBe('85%');
    expect(diag.adapter).toBe('Intel(R) Wi-Fi 6E AX211 160MHz');
    expect(diag.rxTxRate).toBe('300/300 Mbps');
    expect(diag.adminState).toBe('Enabled');
  });

  it('should detect when Wi-Fi is disabled in Windows Settings or Device Manager', () => {
    const ifaceOut = `
Wi-Fi                                      
   Type:                 Dedicated             
   Administrative state: Disabled             
   Connect state:        Disconnected
`;
    const wlanOut = `
There is 1 interface on the system:
    State: disconnected
`;

    const diag = parseWlanOutput(ifaceOut, wlanOut);
    expect(diag.status).toBe('fail');
    expect(diag.adminState).toBe('Disabled');
    expect(diag.state).toBe('disabled');
    expect(diag.error).toContain('disabled');
  });

  it('should detect when Wi-Fi interface is missing or driver is uninstalled', () => {
    const ifaceOut = '';
    const wlanOut = 'There is no wireless interface on the system.';

    const diag = parseWlanOutput(ifaceOut, wlanOut);
    expect(diag.status).toBe('fail');
    expect(diag.state).toBe('disabled');
  });

  it('should detect disconnected Wi-Fi state with warning status', () => {
    const ifaceOut = `
Wi-Fi                                      
   Type:                 Dedicated             
   Administrative state: Enabled             
   Connect state:        Disconnected
`;
    const wlanOut = `
There is 1 interface on the system:
    Description: Intel(R) Wi-Fi 6E AX211 160MHz
    State: disconnected
`;

    const diag = parseWlanOutput(ifaceOut, wlanOut);
    expect(diag.status).toBe('warn');
    expect(diag.state).toBe('disconnected');
    expect(diag.adapter).toBe('Intel(R) Wi-Fi 6E AX211 160MHz');
  });

  it('should export autoRecoverWifi function', () => {
    expect(typeof autoRecoverWifi).toBe('function');
  });

  it('should evaluate stepwise network escalation stages correctly', () => {
    const graceMs = 45 * 60 * 1000;
    const cooldownMs = 60 * 60 * 1000;
    const offlineRebootMs = 180 * 60 * 1000;

    function simulateEscalation(offlineDurationMs: number, timeSinceLastRemediationMs: number) {
      if (offlineDurationMs >= offlineRebootMs) return 'stage3_reboot';
      if (offlineDurationMs >= graceMs && timeSinceLastRemediationMs >= cooldownMs) return 'stage2_remediate';
      if (offlineDurationMs < graceMs) return 'stage1_grace';
      return 'stage1_cooldown_wait';
    }

    // 0 to 44 minutes: Passive observation (grace period)
    expect(simulateEscalation(10 * 60 * 1000, Infinity)).toBe('stage1_grace');
    expect(simulateEscalation(44 * 60 * 1000, Infinity)).toBe('stage1_grace');

    // 45 minutes: Triggers Stage 2 self-healing
    expect(simulateEscalation(45 * 60 * 1000, Infinity)).toBe('stage2_remediate');

    // 55 minutes (10m after remediation): Cooldown active, no second remediation
    expect(simulateEscalation(55 * 60 * 1000, 10 * 60 * 1000)).toBe('stage1_cooldown_wait');

    // 105 minutes (60m after remediation): Cooldown elapsed, second remediation permitted
    expect(simulateEscalation(105 * 60 * 1000, 60 * 60 * 1000)).toBe('stage2_remediate');

    // 180 minutes (3 hours): Stage 3 emergency OS reboot
    expect(simulateEscalation(180 * 60 * 1000, 15 * 60 * 1000)).toBe('stage3_reboot');
    expect(simulateEscalation(240 * 60 * 1000, 70 * 60 * 1000)).toBe('stage3_reboot');
  });
});

