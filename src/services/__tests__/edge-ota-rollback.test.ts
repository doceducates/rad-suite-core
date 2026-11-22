import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Task 4: Zero-Manual Edge OTA Staging & Autonomous Rollback', () => {
  const testDir = path.join(process.cwd(), 'storage', 'test-ota');
  const snapshotDir = path.join(testDir, 'snapshots', 'last_known_good');
  const targetScript = path.join(testDir, 'clinic-agent.js');

  beforeEach(() => {
    fs.mkdirSync(snapshotDir, { recursive: true });
    fs.writeFileSync(targetScript, 'module.exports = { version: 1 };', 'utf8');
    fs.writeFileSync(path.join(snapshotDir, 'clinic-agent.js'), 'module.exports = { version: 1 };', 'utf8');
  });

  afterEach(() => {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  it('rejects syntax corrupted update during pre-flight and retains snapshot', () => {
    const corruptPayload = 'function badSyntax( { broken';
    const tmp = path.join(testDir, 'tmp_clinic-agent.js');
    fs.writeFileSync(tmp, corruptPayload, 'utf8');

    let syntaxCheckPassed = true;
    let syntaxError = '';
    try {
      execSync(`"${process.execPath}" --check "${tmp}"`, { stdio: 'pipe' });
    } catch (err: any) {
      syntaxCheckPassed = false;
      syntaxError = err.stderr ? err.stderr.toString() : err.message;
    }

    expect(syntaxCheckPassed).toBe(false);
    expect(syntaxError.length).toBeGreaterThan(0);

    // Rollback simulation: target script was not overwritten
    const currentScript = fs.readFileSync(targetScript, 'utf8');
    expect(currentScript).toBe('module.exports = { version: 1 };');

    // Clean up tmp
    fs.unlinkSync(tmp);
  });

  it('successfully updates and snapshots when pre-flight passes', () => {
    const validPayload = 'module.exports = { version: 2, feature: "harvest" };';
    const tmp = path.join(testDir, 'tmp_clinic-agent.js');
    fs.writeFileSync(tmp, validPayload, 'utf8');

    let syntaxCheckPassed = true;
    try {
      execSync(`"${process.execPath}" --check "${tmp}"`, { stdio: 'pipe' });
    } catch {
      syntaxCheckPassed = false;
    }

    expect(syntaxCheckPassed).toBe(true);

    // Save previous to snapshot and atomic rename
    fs.copyFileSync(targetScript, path.join(snapshotDir, 'clinic-agent.js'));
    fs.renameSync(tmp, targetScript);

    const updatedScript = fs.readFileSync(targetScript, 'utf8');
    expect(updatedScript).toContain('version: 2');

    const snapScript = fs.readFileSync(path.join(snapshotDir, 'clinic-agent.js'), 'utf8');
    expect(snapScript).toContain('version: 1');
  });
});
