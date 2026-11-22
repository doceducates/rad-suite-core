import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_LGH_PACS } from '@/services/pacs.service';
import * as pacsNetwork from '@/services/pacs-network.service';

describe('LGH PACS Default Auto-Detection & Safeguards', () => {
  it('has default PACS pre-configured with canonical IP and DIMSE parameters', () => {
    expect(DEFAULT_LGH_PACS.host).toBe(process.env.DEFAULT_PACS_HOST || '127.0.0.1');
    expect(DEFAULT_LGH_PACS.port).toBe(8040);
    expect(DEFAULT_LGH_PACS.aeTitle).toBe(process.env.DEFAULT_PACS_AETITLE || 'PACS_CENTRAL');
    expect(DEFAULT_LGH_PACS.callingAeTitle).toBe(process.env.DEFAULT_PACS_CALLING_AE || 'RAD_SUITE');
    expect(DEFAULT_LGH_PACS.retrieveProtocol).toBe('C-GET');
    expect(DEFAULT_LGH_PACS.isDefault).toBe(true);
    expect(DEFAULT_LGH_PACS.isActive).toBe(true);
  });

  it('validates 10.0.0.100 as an allowed private hospital subnet', () => {
    expect(pacsNetwork.isAllowedPacsHost('10.0.0.100')).toBe(true);
    expect(pacsNetwork.isAllowedPacsHost('10.100.71.188')).toBe(true);
    // Blocks AWS metadata SSRF
    expect(pacsNetwork.isAllowedPacsHost('169.254.169.254')).toBe(false);
  });

  it('allows port 8040 in authorized PACS service ports', () => {
    expect(pacsNetwork.ALLOWED_PACS_PORTS.has(8040)).toBe(true);
    expect(pacsNetwork.ALLOWED_PACS_PORTS.has(104)).toBe(true);
    expect(pacsNetwork.ALLOWED_PACS_PORTS.has(11112)).toBe(true);
    // Rejects non-DICOM ports
    expect(pacsNetwork.ALLOWED_PACS_PORTS.has(22)).toBe(false);
    expect(pacsNetwork.ALLOWED_PACS_PORTS.has(3389)).toBe(false);
  });

  it('gracefully handles offsite PACS timeout without crashing', async () => {
    vi.spyOn(pacsNetwork, 'testPacsTcpConnection').mockResolvedValue({
      reachable: false,
      latencyMs: 0,
      error: 'Connection timed out',
    });

    const result = await pacsNetwork.testPacsTcpConnection('10.0.0.100', 8040, 100);
    expect(result.reachable).toBe(false);
    expect(result.error).toBe('Connection timed out');
  });

  it('measures connection latency when on hospital network', async () => {
    vi.spyOn(pacsNetwork, 'testPacsTcpConnection').mockResolvedValue({
      reachable: true,
      latencyMs: 14,
    });

    const result = await pacsNetwork.testPacsTcpConnection('10.0.0.100', 8040, 100);
    expect(result.reachable).toBe(true);
    expect(result.latencyMs).toBe(14);
  });
});
