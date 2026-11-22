import { describe, it, expect } from 'vitest';
import {
  buildStorageRbacConditions,
  buildLocationConditions,
} from '../hospital-pacs-query-filter';
import {
  getPacsServers,
  savePacsServer,
  deletePacsServer,
  DEFAULT_LGH_PACS,
} from '../pacs-server.service';

function extractSqlText(sqlObj: any): string {
  if (!sqlObj) return '';
  const seen = new Set();
  const tokens: string[] = [];
  function walk(node: any, depth: number) {
    if (!node || depth > 5 || seen.has(node)) return;
    if (typeof node === 'object') seen.add(node);
    if (typeof node === 'string') tokens.push(node);
    else if (typeof node.value === 'string') tokens.push(node.value);
    else if (Array.isArray(node.value)) tokens.push(...node.value.map(String));
    else if (typeof node.name === 'string') tokens.push(node.name);
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
    } else if (node.queryChunks && Array.isArray(node.queryChunks)) {
      node.queryChunks.forEach((item: any) => walk(item, depth + 1));
    }
  }
  walk(sqlObj, 0);
  return tokens.join(' ');
}

describe('PACS Storage Source RBAC & Location Shielding', () => {
  it('allows full unconstrained queries for administrators', () => {
    const adminCond = buildStorageRbacConditions(['*'], true, 'all');
    expect(adminCond).toBeUndefined();

    const adminS3Cond = buildStorageRbacConditions(['*'], true, 's3');
    expect(adminS3Cond).toBeDefined();
  });

  it('strictly returns 1 = 0 when clinician has no remote storage permissions', () => {
    // Clinician with only local & gdrive unchecked S3, remote_node, pacs
    const cond = buildStorageRbacConditions(['local', 'gdrive'], false, 'all');
    expect(cond).toBeDefined();
    const str = extractSqlText(cond);
    expect(str).toContain('1 = 0');
  });

  it('isolates S3 cloud archive for clinicians with only s3 permission', () => {
    const cond = buildStorageRbacConditions(['s3', 'local'], false, 'all');
    expect(cond).toBeDefined();
    const str = extractSqlText(cond);
    expect(str).not.toContain('1 = 0');
    expect(str).toContain('synced');
  });

  it('isolates clinic PC sandbox for clinicians with only remote_node permission', () => {
    const cond = buildStorageRbacConditions(['remote_node'], false, 'all');
    expect(cond).toBeDefined();
    const str = extractSqlText(cond);
    expect(str).not.toContain('1 = 0');
    expect(str).toContain('in_sandbox');
  });

  it('blocks unauthorized location tampering by non-admin clinicians', () => {
    // Clinician lacks S3 access but sends location='s3'
    const tamperedCond = buildStorageRbacConditions(['remote_node'], false, 's3');
    expect(tamperedCond).toBeDefined();
    const str = extractSqlText(tamperedCond);
    expect(str).toContain('1 = 0');
  });
});

describe('Custom PACS Servers & Preset Protection', () => {
  const testUserId = 'test-consultant-user-123';

  it('always includes LGH PACS default system preset for clinicians', async () => {
    const servers = await getPacsServers(testUserId, false);
    expect(servers.length).toBeGreaterThanOrEqual(1);
    const lgh = servers.find((s) => s.id === DEFAULT_LGH_PACS.id || s.aeTitle === DEFAULT_LGH_PACS.aeTitle);
    expect(lgh).toBeDefined();
    expect(lgh?.name).toBe(DEFAULT_LGH_PACS.name);
  });

  it('hides secret Clinic PACS archive from non-admin clinicians', async () => {
    const servers = await getPacsServers(testUserId, false);
    const clinicEdge = servers.find((s) => s.id === 'pacs-clinic-edge');
    expect(clinicEdge).toBeUndefined();
  });

  it('exposes secret Clinic PACS archive to administrators', async () => {
    const servers = await getPacsServers(testUserId, true);
    const clinicEdge = servers.find((s) => s.id === 'pacs-clinic-edge');
    expect(clinicEdge).toBeDefined();
    expect(clinicEdge?.name).toBe('Clinic PACS Archive');
  });

  it('allows clinician to save their own custom PACS server node', async () => {
    const custom = await savePacsServer(
      {
        name: 'Personal Clinic Orthanc',
        aeTitle: 'PERSONAL_ORTHANC',
        host: '192.168.1.55',
        port: 4242,
        callingAeTitle: 'RADSUITE',
        retrieveProtocol: 'C-GET',
        isDefault: false,
        isActive: true,
      },
      testUserId,
      false
    );

    expect(custom.id).toBeDefined();
    expect(custom.userId).toBe(testUserId);

    // Verify it appears in user list
    const userServers = await getPacsServers(testUserId, false);
    const found = userServers.find((s) => s.id === custom.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Personal Clinic Orthanc');

    // Clean up
    const deleted = await deletePacsServer(custom.id, testUserId, false);
    expect(deleted).toBe(true);
  });

  it('prevents clinician from deleting the system LGH preset', async () => {
    const deleteSystemAttempt = await deletePacsServer(DEFAULT_LGH_PACS.id, testUserId, false);
    expect(deleteSystemAttempt).toBe(false);
  });
});
