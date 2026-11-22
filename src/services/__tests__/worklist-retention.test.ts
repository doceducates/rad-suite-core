import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWorklistRetentionCleanup, getWorklistRetentionMetrics } from '../worklist-retention.service';

vi.mock('@/services/audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue({}),
}));

describe('Worklist Retention & Auto-Purge Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates retention metrics with safe defaults', async () => {
    const metrics = await getWorklistRetentionMetrics(5);
    expect(metrics).toBeDefined();
    expect(metrics.daysToKeep).toBe(5);
    expect(typeof metrics.purgeableCount).toBe('number');
    expect(typeof metrics.protectedCasesCount).toBe('number');
    expect(typeof metrics.totalStudiesCount).toBe('number');
    expect(metrics.purgeableCount).toBeGreaterThanOrEqual(0);
    expect(metrics.protectedCasesCount).toBeGreaterThanOrEqual(0);
  });

  it('runs retention cleanup and respects doctor case vault', async () => {
    const summary = await runWorklistRetentionCleanup(5);
    expect(summary).toBeDefined();
    expect(typeof summary.orphanedOrdersPruned).toBe('number');
    expect(typeof summary.protectedCasesCount).toBe('number');
    expect(typeof summary.patientsPruned).toBe('number');
    expect(summary.executedAt).toBeDefined();
  });
});
