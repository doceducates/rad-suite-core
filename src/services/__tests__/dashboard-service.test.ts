import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getShiftInfo,
  computeModalityDistribution,
  computeHourlyCurve,
  getDashboardSummary,
} from '../dashboard.service';
import type { PacsStudyResult } from '@/types/pacs';

describe('Dashboard & Command Center Service (Layer 2 Domain)', () => {
  it('correctly calculates Day Shift and modality focus during daytime hours', () => {
    // 10:30 AM
    const dayDate = new Date('2026-10-25T10:30:00Z');
    dayDate.setHours(10);
    const shift = getShiftInfo(dayDate);

    expect(shift.shiftType).toBe('day');
    expect(shift.isTraumaShift).toBe(false);
    expect(shift.activeModalityFocus).toBe('Diagnostic Worklist');
    expect(shift.shiftLabel).toContain('Day Shift');
  });

  it('correctly identifies Night Shift during night hours (01:00 - 07:00)', () => {
    // 03:15 AM
    const nightDate = new Date('2026-10-25T03:15:00Z');
    nightDate.setHours(3);
    const shift = getShiftInfo(nightDate);

    expect(shift.shiftType).toBe('night');
    expect(shift.isTraumaShift).toBe(false);
    expect(shift.activeModalityFocus).toBe('Diagnostic Worklist');
    expect(shift.shiftLabel).toContain('Night Shift');
  });

  it('computes modality distribution percentages and assigns semantic badges', () => {
    const mockCases: Partial<PacsStudyResult>[] = [
      { modality: 'CT' },
      { modality: 'CT' },
      { modality: 'MR' },
      { modality: 'MRI' },
      { modality: 'XR' },
      { modality: 'CR' },
      { modality: 'US' },
    ];

    const distribution = computeModalityDistribution(mockCases as PacsStudyResult[]);

    const ctItem = distribution.find((m) => m.modality === 'CT');
    const mrItem = distribution.find((m) => m.modality === 'MR');
    const xrItem = distribution.find((m) => m.modality === 'XR');
    const usItem = distribution.find((m) => m.modality === 'US');

    expect(ctItem?.count).toBe(2);
    expect(mrItem?.count).toBe(2);
    expect(xrItem?.count).toBe(2);
    expect(usItem?.count).toBe(1);

    expect(ctItem?.percentage).toBe(29);
    expect(mrItem?.percentage).toBe(29);
    expect(xrItem?.percentage).toBe(29);
    expect(usItem?.percentage).toBe(14);
  });

  it('computes 24-hour hourly reporting cadence curve cleanly', () => {
    const mockReports = [
      { signedAt: '2026-10-25T09:15:00Z' },
      { signedAt: '2026-10-25T09:45:00Z' },
      { signedAt: '2026-10-25T14:20:00Z' },
    ];

    const curve = computeHourlyCurve(mockReports);

    expect(curve).toHaveLength(24);
    const hour9 = curve.find((h) => h.hour === new Date('2026-10-25T09:15:00Z').getHours());
    expect(hour9?.count).toBe(2);
    expect(curve.some((h) => h.isCurrentHour)).toBe(true);
  });

  it('aggregates full dashboard summary without throwing and adheres to safety invariants', async () => {
    // Admin request: receives system health and audit trail
    const adminSummary = await getDashboardSummary('admin-id', true);
    expect(adminSummary).toBeDefined();
    expect(adminSummary.shift).toBeDefined();
    expect(adminSummary.kpis).toBeDefined();
    expect(adminSummary.kpis.shiftGoalTarget).toBe(25);
    expect(adminSummary.systemHealth).toBeDefined();
    expect(adminSummary.systemHealth?.hospitalPacs.ip).toBe(`${process.env.DEFAULT_PACS_HOST || '127.0.0.1'}:104`);
    expect(adminSummary.modalityDistribution).toBeInstanceOf(Array);
    expect(adminSummary.hourlyReportingCurve).toHaveLength(24);

    // Non-admin request: Default-deny RBAC shields infrastructure IPs, ports, and audit logs
    const doctorSummary = await getDashboardSummary('doctor-id', false);
    expect(doctorSummary.systemHealth).toBeNull();
    expect(doctorSummary.recentActivity).toHaveLength(0);
  });

  it('enforces Architectural Modularity and Invariant Line Limits on all dashboard files (< 250 target, max 350 lines)', () => {
    const dashboardDir = path.join(process.cwd(), 'src', 'components', 'dashboard');
    const files = fs.readdirSync(dashboardDir).map((f) => path.join(dashboardDir, f));

    files.push(path.join(process.cwd(), 'src', 'services', 'dashboard.service.ts'));
    files.push(path.join(process.cwd(), 'src', 'types', 'dashboard.ts'));
    files.push(path.join(process.cwd(), 'src', 'app', 'api', 'dashboard', 'stats', 'route.ts'));
    files.push(path.join(process.cwd(), 'src', 'app', '(dashboard)', 'dashboard', 'page.tsx'));

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
