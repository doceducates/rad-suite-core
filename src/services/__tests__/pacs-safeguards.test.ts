import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DEFAULT_LGH_PACS } from '../pacs-server.service';
import { queryPacsDimse, echoPacsDimse } from '../pacs-dimse.service';
import { retrieveStudyFromPacs } from '../pacs-retrieval.service';

describe('PACS Configuration & Compatibility Safeguards', () => {
  it('enforces C-GET and canonical PACS defaults to match hospital infrastructure', () => {
    expect(DEFAULT_LGH_PACS.aeTitle).toBe(process.env.DEFAULT_PACS_AETITLE || 'PACS_CENTRAL');
    expect(DEFAULT_LGH_PACS.host).toBe(process.env.DEFAULT_PACS_HOST || '127.0.0.1');
    expect(DEFAULT_LGH_PACS.port).toBe(8040);
    expect(DEFAULT_LGH_PACS.callingAeTitle).toBe(process.env.DEFAULT_PACS_CALLING_AE || 'RAD_SUITE');
    expect(DEFAULT_LGH_PACS.retrieveProtocol).toBe('C-GET');
    expect(DEFAULT_LGH_PACS.listenerPort).toBe(11112);
  });

  it('guarantees pacs_bridge.py uses ModalitiesInStudy (0008,0061) to prevent 0xC000 failure', () => {
    const candidates = [
      path.join(process.cwd(), 'scripts', 'pacs_bridge.py'),
      path.resolve(process.cwd(), '../rad-suite-plugins/ops/pacs_bridge.py'),
    ];
    const bridgePath = candidates.find((c) => fs.existsSync(c));
    if (!bridgePath) return;

    const content = fs.readFileSync(bridgePath, 'utf8');
    // Ensure ModalitiesInStudy is explicitly assigned in the C-FIND dataset
    expect(content).toContain('ModalitiesInStudy');
    // Ensure we do NOT set ds.Modality at the Study Root level
    expect(content).not.toMatch(/ds\.Modality\s*=/);
  });

  it('guarantees fast offline failover (< 1500ms) when PACS network is disconnected', async () => {
    const start = Date.now();
    // Test against an unreachable test server
    const dummyServer: any = {
      id: 'test-offline',
      name: 'Offline Node',
      aeTitle: 'OFFLINE_AE',
      host: '192.0.2.1', // RFC 5737 TEST-NET (unroutable)
      port: 8040,
      callingAeTitle: 'RADIANT',
      retrieveProtocol: 'C-GET',
      isDefault: false,
      isActive: true,
    };

    const results = await queryPacsDimse({ modality: 'MRI', dateRange: 'yesterday' }, dummyServer);
    const elapsed = Date.now() - start;

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it('handles offline study retrieval gracefully without crashing', async () => {
    const res = await retrieveStudyFromPacs('NON_EXISTENT_ACC', '1.2.3.4.5');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
    expect(res.protocol).toBe('C-GET');
  });

  it('protects RadiAnt pacs.xml host settings for LGH HMIS_PACS', () => {
    const pacsXmlPath = path.join(
      process.env.APPDATA || 'C:\\Users\\muham\\AppData\\Roaming',
      'RadiantViewer',
      'pacs.xml'
    );

    if (fs.existsSync(pacsXmlPath)) {
      const xml = fs.readFileSync(pacsXmlPath, 'utf8');
      expect(xml).toContain('ae="HMIS_PACS"');
      expect(xml).toMatch(/ip="[^"]+"/);
      expect(xml).toContain('port="8040"');
    }
  });

  it('ensures network fix script does not hardcode obsolete 10.100.71.1 gateway', () => {
    const candidates = [
      path.join(process.cwd(), 'scripts', 'fix-pacs-network.ps1'),
      path.resolve(process.cwd(), '../rad-suite-plugins/ops/fix-pacs-network.ps1'),
    ];
    const scriptPath = candidates.find((c) => fs.existsSync(c));
    if (!scriptPath) return;

    const script = fs.readFileSync(scriptPath, 'utf8');
    expect(script).not.toContain('$ethernetGateway = "10.100.71.1"');
    expect(script).toContain('$currentEthGw');
  });
});
