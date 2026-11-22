import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createStudyZipBuffer } from '../hot-case-archiver.service';
import { applyClinicActionSettings } from '../clinic-action-handler';
import type { ClinicNodeTelemetry } from '../clinic-node.types';

describe('Hot Case Study ZIP Archiver & Unified Settings', () => {
  let tempStudyDir: string;

  beforeEach(() => {
    tempStudyDir = path.join(os.tmpdir(), `test_study_${Date.now()}`);
    fs.mkdirSync(tempStudyDir, { recursive: true });

    // Create 2 series directories with mock DICOM files
    const s1 = path.join(tempStudyDir, 'series-1_T2_SAG');
    const s2 = path.join(tempStudyDir, 'series-2_T1_AXIAL');
    fs.mkdirSync(s1, { recursive: true });
    fs.mkdirSync(s2, { recursive: true });

    fs.writeFileSync(path.join(s1, 'slice-0.dcm'), Buffer.from('DICM_MOCK_SLICE_1'));
    fs.writeFileSync(path.join(s1, 'slice-1.dcm'), Buffer.from('DICM_MOCK_SLICE_2'));
    fs.writeFileSync(path.join(s2, 'slice-0.dcm'), Buffer.from('DICM_MOCK_SLICE_3'));
  });

  afterEach(() => {
    if (fs.existsSync(tempStudyDir)) {
      fs.rmSync(tempStudyDir, { recursive: true, force: true });
    }
  });

  it('compiles a local hot case study directory into a valid single ZIP buffer', async () => {
    const zipBuf = await createStudyZipBuffer(tempStudyDir);
    expect(zipBuf).toBeInstanceOf(Buffer);
    expect(zipBuf.length).toBeGreaterThan(50);

    // Verify ZIP magic header: PK\x03\x04
    expect(zipBuf[0]).toBe(0x50);
    expect(zipBuf[1]).toBe(0x4b);
    expect(zipBuf[2]).toBe(0x03);
    expect(zipBuf[3]).toBe(0x04);
  });

  it('atomically applies save-all-settings payload to clinic node telemetry', () => {
    const mockTelemetry: ClinicNodeTelemetry = {
      nodeId: 'clinic-pc-primary',
      name: 'Primary Clinic PC',
      online: true,
      lastHeartbeat: new Date().toISOString(),
      heartbeatIntervalMs: 5000,
      syncPaused: false,
      harvestSchedule: {
        enabled: true,
        intervalMinutes: 5,
        modalities: ['MR'],
        scope: 'today',
      },
      syncRules: {
        allowedModalities: ['MR'],
        descriptionKeywords: ['brain'],
        syncMode: 'auto_filtered',
      },
      stallWatchdog: {
        enabled: true,
        softRestartMinutes: 20,
        autoRebootMinutes: 40,
      },
      peerCooperation: {
        enabled: true,
        leaseTtlMinutes: 5,
      },
      schedule: {
        enabled: false,
        startHour: 20,
        endHour: 8,
      },
    } as unknown as ClinicNodeTelemetry;

    const payload = {
      harvestSchedule: {
        enabled: true,
        intervalMinutes: 2,
        modalities: ['MR', 'CT'],
        scope: 'last_2_days',
        bypassKeywords: true,
      },
      syncRules: {
        allowedModalities: ['MR'],
        descriptionKeywords: ['spine', 'lumbar'],
        bypassKeywords: false,
        syncMode: 'auto_filtered',
      },
      stallWatchdog: {
        enabled: true,
        softRestartMinutes: 15,
        autoRebootMinutes: 30,
      },
      peerCooperation: {
        enabled: true,
        leaseTtlMinutes: 10,
      },
      schedule: {
        enabled: true,
        startHour: 22,
        endHour: 6,
      },
      disk: {
        maxStorageSizeGb: 200,
      },
    };

    applyClinicActionSettings(mockTelemetry, 'save-all-settings', payload);

    expect(mockTelemetry.harvestSchedule?.intervalMinutes).toBe(2);
    expect(mockTelemetry.harvestSchedule?.scope).toBe('last_2_days');
    expect(mockTelemetry.harvestSchedule?.bypassKeywords).toBe(true);
    expect(mockTelemetry.syncRules?.descriptionKeywords).toContain('lumbar');
    expect(mockTelemetry.stallWatchdog?.softRestartMinutes).toBe(15);
    expect(mockTelemetry.peerCooperation?.leaseTtlMinutes).toBe(10);
    expect(mockTelemetry.schedule?.enabled).toBe(true);
    expect(mockTelemetry.schedule?.startHour).toBe(22);
    expect(mockTelemetry.disk?.maxStorageSizeGb).toBe(200);
  });
});
