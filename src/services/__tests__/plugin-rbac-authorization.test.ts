import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { PluginManagerService } from '../plugin-manager.service';

const TEST_DIR = path.resolve(process.cwd(), 'scratch', 'test-plugin-rbac');

describe('Plugin RBAC & Admin Authorization Lifecycle', () => {
  let service: PluginManagerService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new PluginManagerService(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('clinician install should be locked and pending authorization', async () => {
    const zip = new JSZip();
    zip.file(
      'manifest.json',
      JSON.stringify({
        id: 'clinician-tool',
        name: 'Clinician Tool',
        version: '1.0.0',
        description: 'Test extension',
        slots: [
          {
            slotId: 'workstation:toolbar',
            id: 'clinician-btn',
            title: 'Clinician Button',
          },
        ],
      })
    );
    const buf = await zip.generateAsync({ type: 'nodebuffer' });

    // Clinician installs
    const installResult = await service.installPluginZip(buf, {
      id: 'usr-pgr',
      email: 'consultant@radsuite.pk',
      role: 'consultant',
    });

    expect(installResult.success).toBe(true);
    expect(installResult.pendingApproval).toBe(true);
    expect(installResult.plugin.authorized).toBe(false);
    expect(installResult.plugin.enabled).toBe(false);

    // List plugins returns pending_authorization
    const plugins = await service.listPlugins();
    expect(plugins.length).toBe(1);
    expect(plugins[0].status).toBe('pending_authorization');

    // Slot contributions must be empty for unauthorized plugins
    const toolbarSlots = await service.getSlotContributions('workstation:toolbar');
    expect(toolbarSlots.length).toBe(0);

    // Admin authorizes and activates the plugin
    const authResult = await service.authorizePlugin('clinician-tool', true, {
      id: 'usr-admin',
      email: 'admin@radsuite.pk',
    });

    expect(authResult.status).toBe('active');
    expect(authResult.manifest.authorized).toBe(true);
    expect(authResult.manifest.enabled).toBe(true);

    // Now slot contributions ARE active
    const activeSlots = await service.getSlotContributions('workstation:toolbar');
    expect(activeSlots.length).toBe(1);
    expect(activeSlots[0].title).toBe('Clinician Button');

    // Admin revokes authorization
    const revokeResult = await service.authorizePlugin('clinician-tool', false, {
      id: 'usr-admin',
      email: 'admin@radsuite.pk',
    });
    expect(revokeResult.status).toBe('pending_authorization');

    // Slot contributions are removed immediately
    const revokedSlots = await service.getSlotContributions('workstation:toolbar');
    expect(revokedSlots.length).toBe(0);
  });

  it('filters out admin-only slot contributions from non-admin clinicians', async () => {
    const zip = new JSZip();
    zip.file(
      'manifest.json',
      JSON.stringify({
        id: 'secure-node',
        name: 'Secure Node',
        version: '1.0.0',
        slots: [
          {
            slotId: 'navigation:sidebar',
            id: 'admin-slot',
            title: 'Admin Console',
            roles: ['admin'],
          },
          {
            slotId: 'navigation:sidebar',
            id: 'general-slot',
            title: 'General Menu',
          },
        ],
      })
    );
    const buf = await zip.generateAsync({ type: 'nodebuffer' });

    await service.installPluginZip(buf, { id: 'usr-admin', role: 'admin' });
    await service.authorizePlugin('secure-node', true, { id: 'usr-admin' });

    // Non-admin query
    const clinicianSlots = await service.getSlotContributions('navigation:sidebar', 'consultant');
    expect(clinicianSlots.length).toBe(1);
    expect(clinicianSlots[0].id).toBe('general-slot');

    // Admin query
    const adminSlots = await service.getSlotContributions('navigation:sidebar', 'admin');
    expect(adminSlots.length).toBe(2);
  });
});
