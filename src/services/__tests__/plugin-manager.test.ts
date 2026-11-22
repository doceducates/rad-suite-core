import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { PluginManagerService } from '@/services/plugin-manager.service';
import { PluginManifestSchema } from '@/lib/plugins/plugin-validation';

describe('Plugin Architecture & Manager (Stage 2 Verification)', () => {
  const testPluginsDir = path.resolve(__dirname, '../../../test-plugins-sandbox');
  let service: PluginManagerService;

  beforeEach(() => {
    if (fs.existsSync(testPluginsDir)) {
      fs.rmSync(testPluginsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testPluginsDir, { recursive: true });
    service = new PluginManagerService(testPluginsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testPluginsDir)) {
      fs.rmSync(testPluginsDir, { recursive: true, force: true });
    }
  });

  it('validates a correct plugin manifest schema', () => {
    const validManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin for validation',
      slots: [
        {
          slotId: 'workstation:toolbar',
          id: 'quick-action',
          title: 'Quick Tool',
          order: 10,
        },
      ],
      enabled: true,
    };

    const parsed = PluginManifestSchema.safeParse(validManifest);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid plugin manifest with missing version or bad id', () => {
    const invalidManifest = {
      id: 'INVALID_ID_WITH_CAPS',
      name: 'Bad Plugin',
    };

    const parsed = PluginManifestSchema.safeParse(invalidManifest);
    expect(parsed.success).toBe(false);
  });

  it('installs a valid plugin from a zip buffer and lists it as active', async () => {
    const zip = new JSZip();
    const manifest = {
      id: 'sample-gateway',
      name: 'Sample Gateway',
      version: '1.2.0',
      description: 'Sample modular extension',
      slots: [
        {
          slotId: 'workstation:tab',
          id: 'gateway-tab',
          title: 'Gateway View',
          order: 5,
        },
      ],
      backendPort: 8085,
      enabled: true,
    };

    zip.file('manifest.json', JSON.stringify(manifest));
    zip.file('index.js', 'console.log("Plugin loaded");');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const installRes = await service.installPluginZip(zipBuffer, 'test-admin-id');
    expect(installRes.success).toBe(true);
    expect(installRes.plugin.id).toBe('sample-gateway');

    const plugins = await service.listPlugins();
    expect(plugins.length).toBe(1);
    expect(plugins[0].manifest.id).toBe('sample-gateway');
    expect(plugins[0].status).toBe('active');

    const contributions = await service.getSlotContributions('workstation:tab');
    expect(contributions.length).toBe(1);
    expect(contributions[0].title).toBe('Gateway View');
  });

  it('toggles plugin enabled state correctly', async () => {
    const zip = new JSZip();
    const manifest = {
      id: 'toggleable-plugin',
      name: 'Toggleable',
      version: '1.0.0',
      description: 'Test toggling',
      enabled: true,
    };

    zip.file('manifest.json', JSON.stringify(manifest));
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await service.installPluginZip(zipBuffer);

    // Disable
    const disabled = await service.togglePlugin('toggleable-plugin', false);
    expect(disabled.status).toBe('disabled');

    const listAfterDisable = await service.listPlugins();
    expect(listAfterDisable[0].status).toBe('disabled');

    // Re-enable
    const reEnabled = await service.togglePlugin('toggleable-plugin', true);
    expect(reEnabled.status).toBe('active');
  });

  it('uninstalls a plugin cleanly', async () => {
    const zip = new JSZip();
    const manifest = {
      id: 'removable-plugin',
      name: 'Removable',
      version: '1.0.0',
      description: 'Test removal',
      enabled: true,
    };

    zip.file('manifest.json', JSON.stringify(manifest));
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await service.installPluginZip(zipBuffer);

    const deleted = await service.uninstallPlugin('removable-plugin');
    expect(deleted).toBe(true);

    const plugins = await service.listPlugins();
    expect(plugins.length).toBe(0);
  });
});
