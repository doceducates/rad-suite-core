import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computePendingAnalytics,
  getPendingCasesWithAnalytics,
} from '../dashboard-pending.service';
import type { PendingCaseItem } from '@/types/dashboard';

describe('Dashboard Pending Cases & Analytics Service (Layer 2 Domain)', () => {
  it('handles empty pending cases gracefully with default fallback values', () => {
    const analytics = computePendingAnalytics([]);
    expect(analytics.totalPending).toBe(0);
    expect(analytics.mostCommonReason).toBe('None');
    expect(analytics.highestVolumeConsultant).toBe('None');
    expect(analytics.byReason).toHaveLength(0);
    expect(analytics.byConsultant).toHaveLength(0);
  });

  it('aggregates pending reasons, computes percentages, and identifies leading bottleneck', () => {
    const mockCases: Partial<PendingCaseItem>[] = [
      { pendingReason: 'awaiting_prior_images', pendingReasonLabel: 'Awaiting Prior Comparison Films', assignedConsultantName: 'Dr. Asim' },
      { pendingReason: 'awaiting_prior_images', pendingReasonLabel: 'Awaiting Prior Comparison Films', assignedConsultantName: 'Dr. Tariq' },
      { pendingReason: 'missing_history_form', pendingReasonLabel: 'Missing Paper History Form / Record', assignedConsultantName: 'Dr. Asim' },
      { pendingReason: 'awaiting_lab_creatinine', pendingReasonLabel: 'Awaiting Renal Profile / Creatinine', assignedConsultantName: 'Dr. Farhan' },
    ];

    const analytics = computePendingAnalytics(mockCases as PendingCaseItem[]);

    expect(analytics.totalPending).toBe(4);
    expect(analytics.mostCommonReason).toBe('Awaiting Prior Comparison Films');
    expect(analytics.byReason).toHaveLength(3);

    const topReason = analytics.byReason[0];
    expect(topReason.reason).toBe('awaiting_prior_images');
    expect(topReason.count).toBe(2);
    expect(topReason.percentage).toBe(50);
  });

  it('aggregates consultant pending workload and identifies consultant with the most pending cases', () => {
    const mockCases: Partial<PendingCaseItem>[] = [
      { pendingReason: 'awaiting_prior_images', assignedConsultantName: 'Dr. Tariq' },
      { pendingReason: 'missing_history_form', assignedConsultantName: 'Dr. Asim' },
      { pendingReason: 'motion_artifact_repeat', assignedConsultantName: 'Dr. Tariq' },
      { pendingReason: 'awaiting_lab_creatinine', assignedConsultantName: 'Dr. Tariq' },
      { pendingReason: 'other', assignedConsultantName: 'Dr. Farhan' },
    ];

    const analytics = computePendingAnalytics(mockCases as PendingCaseItem[]);

    expect(analytics.totalPending).toBe(5);
    expect(analytics.highestVolumeConsultant).toBe('Dr. Tariq');

    const topConsultant = analytics.byConsultant[0];
    expect(topConsultant.consultantName).toBe('Dr. Tariq');
    expect(topConsultant.count).toBe(3);
    expect(topConsultant.percentage).toBe(60);

    const secondConsultant = analytics.byConsultant[1];
    expect(secondConsultant.count).toBe(1);
    expect(secondConsultant.percentage).toBe(20);
  });

  it('queries database safely via getPendingCasesWithAnalytics without throwing', async () => {
    const result = await getPendingCasesWithAnalytics(15);

    expect(result).toBeDefined();
    expect(Array.isArray(result.pendingQueue)).toBe(true);
    expect(result.pendingAnalytics).toBeDefined();
    expect(typeof result.pendingAnalytics.totalPending).toBe('number');
  });

  it('enforces Architectural Modularity and Line Limit Invariants (< 250 target, max 350 lines)', () => {
    const files = [
      path.join(process.cwd(), 'src', 'services', 'dashboard-pending.service.ts'),
      path.join(process.cwd(), 'src', 'components', 'dashboard', 'dashboard-pending-queue.tsx'),
      path.join(process.cwd(), 'src', 'components', 'dashboard', 'dashboard-pending-analytics.tsx'),
      path.join(process.cwd(), 'src', 'components', 'dashboard', 'dashboard-urgent-triage.tsx'),
      path.join(process.cwd(), 'src', 'components', 'dashboard', 'dashboard-view.tsx'),
    ];

    for (const filePath of files) {
      expect(fs.existsSync(filePath), `File exists: ${path.basename(filePath)}`).toBe(true);
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').length;
      expect(
        lines,
        `${path.basename(filePath)} (${lines} lines) must be strictly under 350 lines`
      ).toBeLessThan(350);
    }
  });
});
