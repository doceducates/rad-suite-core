import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Clinic Node Logger & Retention Service', () => {
  const loggerPath = path.resolve(process.cwd(), 'plugins/clinic-edge/host-scripts/clinic-logger.js');
  let logger: any;
  let testLogsDir: string;

  beforeEach(() => {
    logger = require(loggerPath);
    testLogsDir = logger.LOGS_DIR;
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }
  });

  it('exports structured logging methods and log directory', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.pruneLogs).toBe('function');
    expect(typeof logger.getRecentLogs).toBe('function');
    expect(typeof logger.patchConsole).toBe('function');
    expect(typeof logger.handleLogAdminAction).toBe('function');
    expect(typeof logger.LOGS_DIR).toBe('string');
  });

  it('writes structured log entries with timestamps, levels, and tags', () => {
    const today = new Date().toISOString().slice(0, 10);
    const testTag = 'TEST_SUITE';
    const testMsg = `Unit test message ${Date.now()}`;

    logger.info(testTag, testMsg, { detail: 'unit-test' });

    const logFile = path.join(testLogsDir, `clinic-node-${today}.log`);
    expect(fs.existsSync(logFile)).toBe(true);

    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('[INFO]');
    expect(content).toContain(`[${testTag}]`);
    expect(content).toContain(testMsg);
    expect(content).toContain('"detail":"unit-test"');
  });

  it('retrieves recent logs with filtering by level and line limits', () => {
    const res = logger.getRecentLogs({ lines: 10, level: 'INFO' });
    expect(res).toBeDefined();
    expect(res.file).toContain('clinic-node-');
    expect(Array.isArray(res.lines)).toBe(true);
    expect(res.retentionPolicy).toContain('2-3 Days');
  });

  it('prunes daily logs older than 3 days while keeping recent logs', () => {
    // Create a mock expired log file (5 days old)
    const oldDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const oldFile = path.join(testLogsDir, `clinic-node-${oldDate}.log`);
    fs.writeFileSync(oldFile, 'old log entry\n', 'utf8');

    // Create a mock recent log file (1 day old)
    const recentDate = new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const recentFile = path.join(testLogsDir, `clinic-node-${recentDate}.log`);
    fs.writeFileSync(recentFile, 'recent log entry\n', 'utf8');

    const result = logger.pruneLogs(3);

    expect(result.deletedFiles).toContain(`clinic-node-${oldDate}.log`);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(recentFile)).toBe(true);

    // Clean up mock recent file
    if (fs.existsSync(recentFile)) fs.unlinkSync(recentFile);
  });
});
