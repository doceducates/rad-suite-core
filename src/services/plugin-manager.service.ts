import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { logAudit } from './audit.service';
import type { PluginManifest, PluginRuntimeInfo, PluginSlotContribution, PluginSlotId } from '@/lib/plugins/plugin-types';
import { PluginManifestSchema } from '@/lib/plugins/plugin-validation';

export class PluginManagerService {
  private pluginsDir: string;

  constructor(customDir?: string) {
    this.pluginsDir = customDir || path.resolve(process.cwd(), 'plugins');
    this.ensureDirectory(this.pluginsDir);
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  public getPluginsDir(): string {
    return this.pluginsDir;
  }

  public async listPlugins(): Promise<PluginRuntimeInfo[]> {
    this.ensureDirectory(this.pluginsDir);
    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    const plugins: PluginRuntimeInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(this.pluginsDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, 'utf8');
        const parsed = JSON.parse(raw);
        const manifest = PluginManifestSchema.parse(parsed);
        const status = manifest.authorized === false
          ? 'pending_authorization'
          : manifest.enabled
          ? 'active'
          : 'disabled';

        plugins.push({
          manifest: manifest as PluginManifest,
          status,
        });
      } catch (err: unknown) {
        plugins.push({
          manifest: {
            id: entry.name,
            name: entry.name,
            version: 'unknown',
            description: 'Failed to load valid plugin manifest',
            enabled: false,
          },
          status: 'error',
          error: err instanceof Error ? err.message : 'Invalid manifest',
        });
      }
    }

    return plugins;
  }

  public async getPlugin(pluginId: string): Promise<PluginRuntimeInfo | null> {
    const plugins = await this.listPlugins();
    return plugins.find((p) => p.manifest.id === pluginId) || null;
  }

  public async togglePlugin(pluginId: string, enabled: boolean, userId?: string): Promise<PluginRuntimeInfo> {
    const pluginDir = path.join(this.pluginsDir, pluginId);
    const manifestPath = path.join(pluginDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin "${pluginId}" not found.`);
    }

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = PluginManifestSchema.parse(JSON.parse(raw));
    manifest.enabled = enabled;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    await logAudit({
      action: enabled ? 'PLUGIN_ENABLE' : 'PLUGIN_DISABLE',
      entityType: 'plugin',
      entityId: pluginId,
      details: `Plugin "${manifest.name}" (${pluginId}) was ${enabled ? 'enabled' : 'disabled'}.`,
      userId,
    });

    return {
      manifest: manifest as PluginManifest,
      status: enabled ? 'active' : 'disabled',
    };
  }

  public async installPluginZip(
    zipBuffer: Buffer,
    actor?: { id: string; email?: string; role?: string } | string
  ): Promise<{ success: boolean; plugin: PluginManifest; message: string; pendingApproval?: boolean }> {
    const zip = await JSZip.loadAsync(zipBuffer);
    const manifestFile = zip.file('manifest.json');

    if (!manifestFile) {
      throw new Error('Invalid plugin bundle: "manifest.json" is missing from archive root.');
    }

    const manifestContent = await manifestFile.async('text');
    let manifestData: unknown;
    try {
      manifestData = JSON.parse(manifestContent);
    } catch {
      throw new Error('Failed to parse manifest.json: Invalid JSON format.');
    }

    const manifest = PluginManifestSchema.parse(manifestData);
    manifest.installedAt = new Date().toISOString();

    const isAdmin = !actor || (typeof actor === 'object' ? actor?.role === 'admin' : true);
    const actorId = typeof actor === 'object' ? actor?.id : actor;
    const actorEmail = typeof actor === 'object' ? actor?.email : undefined;

    if (!isAdmin) {
      manifest.enabled = false;
      manifest.authorized = false;
      manifest.installedBy = actorEmail || actorId || 'clinician';
    } else {
      manifest.authorized = true;
      manifest.authorizedBy = actorEmail || 'admin';
      manifest.authorizedAt = new Date().toISOString();
    }

    const targetDir = path.join(this.pluginsDir, manifest.id);
    this.ensureDirectory(targetDir);

    // Extract all files safely, preventing Zip Slip path traversal
    const fileNames = Object.keys(zip.files);
    for (const relativePath of fileNames) {
      const zipEntry = zip.files[relativePath];
      
      // Zip Slip protection
      const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
      if (safePath.startsWith('..') || path.isAbsolute(safePath)) {
        throw new Error(`Malicious zip entry detected: "${relativePath}" escapes destination.`);
      }

      const destPath = path.join(targetDir, safePath);

      if (zipEntry.dir) {
        this.ensureDirectory(destPath);
      } else {
        this.ensureDirectory(path.dirname(destPath));
        const fileContent = await zipEntry.async('nodebuffer');
        fs.writeFileSync(destPath, fileContent);
      }
    }

    // Ensure updated manifest with installedAt and authorization metadata is saved
    fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    await logAudit({
      action: 'PLUGIN_INSTALL',
      entityType: 'plugin',
      entityId: manifest.id,
      details: `Installed plugin "${manifest.name}" v${manifest.version}${!isAdmin ? ' (pending administrator authorization)' : ''}.`,
      userId: actorId,
    });

    const pendingApproval = !isAdmin;
    return {
      success: true,
      plugin: manifest as PluginManifest,
      pendingApproval,
      message: pendingApproval
        ? `Plugin "${manifest.name}" uploaded. It is locked and inactive until verified and authorized by a System Administrator.`
        : `Plugin "${manifest.name}" v${manifest.version} installed and authorized successfully.`,
    };
  }

  public async authorizePlugin(
    pluginId: string,
    authorized: boolean,
    adminActor?: { id?: string; email?: string }
  ): Promise<PluginRuntimeInfo> {
    const pluginDir = path.join(this.pluginsDir, pluginId);
    const manifestPath = path.join(pluginDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin "${pluginId}" not found.`);
    }

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = PluginManifestSchema.parse(JSON.parse(raw));
    manifest.authorized = authorized;
    if (authorized) {
      manifest.authorizedBy = adminActor?.email || 'admin';
      manifest.authorizedAt = new Date().toISOString();
      manifest.enabled = true;
    } else {
      manifest.enabled = false;
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    await logAudit({
      action: authorized ? 'PLUGIN_AUTHORIZE' : 'PLUGIN_REVOKE_AUTH',
      entityType: 'plugin',
      entityId: pluginId,
      details: `Plugin "${manifest.name}" (${pluginId}) authorization was ${authorized ? 'approved' : 'revoked'}.`,
      userId: adminActor?.id,
    });

    return {
      manifest: manifest as PluginManifest,
      status: manifest.authorized ? (manifest.enabled ? 'active' : 'disabled') : 'pending_authorization',
    };
  }

  public async uninstallPlugin(pluginId: string, userId?: string): Promise<boolean> {
    const pluginDir = path.join(this.pluginsDir, pluginId);
    if (!fs.existsSync(pluginDir)) {
      return false;
    }

    fs.rmSync(pluginDir, { recursive: true, force: true });

    await logAudit({
      action: 'PLUGIN_UNINSTALL',
      entityType: 'plugin',
      entityId: pluginId,
      details: `Uninstalled plugin "${pluginId}".`,
      userId,
    });

    return true;
  }

  public async getSlotContributions(slotId: PluginSlotId, userRole?: string): Promise<PluginSlotContribution[]> {
    const plugins = await this.listPlugins();
    const activePlugins = plugins.filter((p) => p.status === 'active' && p.manifest.authorized !== false);
    const contributions: PluginSlotContribution[] = [];

    for (const p of activePlugins) {
      if (!p.manifest.slots) continue;
      for (const slot of p.manifest.slots) {
        if (slot.slotId === slotId) {
          if (slot.roles && slot.roles.length > 0) {
            if (!userRole || (userRole !== 'admin' && userRole !== 'service' && !slot.roles.includes(userRole))) {
              continue;
            }
          }
          contributions.push(slot);
        }
      }
    }

    return contributions.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
}

export const pluginManager = new PluginManagerService();
