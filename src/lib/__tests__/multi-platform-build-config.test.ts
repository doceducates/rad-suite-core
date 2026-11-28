import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Multi-Platform Tauri & CI Build Configuration Invariants', () => {
  it('keeps bundle.resources cleared as an array/null in tauri.android.conf.json', () => {
    const androidConf = JSON.parse(readRepoFile('src-tauri/tauri.android.conf.json'));
    const res = androidConf?.bundle?.resources;
    expect(Array.isArray(res) || res === null).toBe(true);
    if (Array.isArray(res)) {
      expect(res).toHaveLength(0);
    }
  });

  it('gates tauri-plugin-updater to desktop targets in Cargo.toml, lib.rs, and capabilities', () => {
    const cargoToml = readRepoFile('src-tauri/Cargo.toml');
    const depsSection = cargoToml.split(/\[target\./)[0];
    expect(depsSection).not.toMatch(/^\s*tauri-plugin-updater\s*=/m);
    expect(cargoToml).toMatch(/\[target\.'cfg\(not\(any\(target_os = "android", target_os = "ios"\)\)\)'\.dependencies\][\s\S]*?tauri-plugin-updater\s*=/);

    const libRs = readRepoFile('src-tauri/src/lib.rs');
    expect(libRs).toMatch(/#\[cfg\((?:desktop|not\(any\(target_os = "android", target_os = "ios"\)\))\)\][\s\S]{0,120}tauri_plugin_updater/);

    const defaultCap = JSON.parse(readRepoFile('src-tauri/capabilities/default.json'));
    expect(defaultCap.permissions).not.toContain('updater:default');

    const desktopCap = JSON.parse(readRepoFile('src-tauri/capabilities/desktop.json'));
    expect(desktopCap.permissions).toContain('updater:default');
    expect(desktopCap.platforms).toEqual(expect.arrayContaining(['linux', 'macOS', 'windows']));
  });

  it('configures build-all-platforms.yml safely for Windows, Android, macOS, and Linux', () => {
    const workflow = readRepoFile('.github/workflows/build-all-platforms.yml');

    // macOS must not use unsupported macos-14 runner
    expect(workflow).not.toMatch(/runs-on:\s*macos-14\b/);
    expect(workflow).toMatch(/runs-on:\s*macos-latest\b/);

    // macOS and Linux must populate src-tauri/resources/standalone before Tauri build
    const standaloneCopies = workflow.match(/src-tauri\/resources\/standalone/g) || [];
    expect(standaloneCopies.length).toBeGreaterThanOrEqual(4);

    // Linux must disable binary stripping and FUSE for AppImage bundling
    expect(workflow).toMatch(/NO_STRIP:\s*"?1"?/);
    expect(workflow).toMatch(/APPIMAGE_EXTRACT_AND_RUN:\s*"?1"?/);

    // Android must pass tauri.android.conf.json and install compileSdk 36 platform
    expect(workflow).toMatch(/--config\s+src-tauri\/tauri\.android\.conf\.json/);
    expect(workflow).toMatch(/platforms;android-36/);

    // auto-bump must guard against infinite CI loops
    expect(workflow).toMatch(/\[skip ci\]/);
    expect(workflow).toMatch(/chore\(release\):/);
  });

  it('keeps valid semver across package.json, tauri.conf.json, and Cargo.toml', () => {
    const pkg = JSON.parse(readRepoFile('package.json'));
    const tauriConf = JSON.parse(readRepoFile('src-tauri/tauri.conf.json'));
    const cargoToml = readRepoFile('src-tauri/Cargo.toml');
    const cargoVerMatch = cargoToml.match(/^version\s*=\s*"(\d+\.\d+\.\d+)"/m);

    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(tauriConf.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(cargoVerMatch?.[1]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(fs.existsSync(path.join(repoRoot, 'scripts/bump-version.js'))).toBe(true);
  });
});
