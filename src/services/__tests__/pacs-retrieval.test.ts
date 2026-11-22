import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveStudyFromPacs } from '../pacs-retrieval.service';
import * as pacsNetwork from '../pacs-network.service';
import * as pacsServerService from '../pacs-server.service';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('PACS Retrieval Service (C-GET & C-MOVE)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gracefully handles unreachable PACS server without throwing unhandled exceptions', async () => {
    vi.spyOn(pacsServerService, 'getDefaultPacsServer').mockResolvedValue({
      id: 'srv-1',
      name: 'LGH HMIS_PACS',
      aeTitle: 'HMIS_PACS',
      host: '192.168.1.100',
      port: 11112,
      callingAeTitle: 'RADIANT',
      listenerPort: 11112,
      retrieveProtocol: 'C-GET',
      isDefault: true,
      isActive: true,
    });

    vi.spyOn(pacsNetwork, 'testPacsTcpConnection').mockResolvedValue({
      reachable: false,
      latencyMs: 1200,
      error: 'Connection timed out',
    });

    const result = await retrieveStudyFromPacs('ACC-998822');

    expect(result.success).toBe(false);
    expect(result.reachable).toBe(false);
    expect(result.error).toContain('offline or unreachable');
    expect(result.serverName).toBe('LGH HMIS_PACS');
  });

  it('successfully retrieves study metadata and instances when PACS node is online', async () => {
    vi.spyOn(pacsServerService, 'getDefaultPacsServer').mockResolvedValue({
      id: 'srv-1',
      name: 'LGH HMIS_PACS',
      aeTitle: 'HMIS_PACS',
      host: '127.0.0.1',
      port: 11112,
      callingAeTitle: 'RADIANT',
      listenerPort: 11112,
      retrieveProtocol: 'C-MOVE',
      isDefault: true,
      isActive: true,
    });

    vi.spyOn(pacsNetwork, 'testPacsTcpConnection').mockResolvedValue({
      reachable: true,
      latencyMs: 12,
    });

    const result = await retrieveStudyFromPacs('ACC-ONLINE-1');

    expect(result.success).toBe(true);
    expect(result.reachable).toBe(true);
    expect(result.protocol).toBe('C-MOVE');
  });
});
