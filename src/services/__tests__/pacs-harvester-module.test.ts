import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { getClinicHostFiles, getClinicHostDir } from '../clinic-node-manifest.service';

/**
 * Test Suite: PACS Harvester Edge Module Contracts & Logic
 * Validates the node harvester module that communicates with Orthanc
 * to pull cases from HMIS_PACS without touching any console PCs.
 */

describe('PACS Harvester Module & Edge Contracts', () => {
  const hostDir = getClinicHostDir();
  const harvesterPath = path.resolve(hostDir, 'pacs-harvester.js');
  const uploaderPath = path.resolve(hostDir, 's3-uploader.js');
  const agentPath = path.resolve(hostDir, 'clinic-agent.js');
  const bundleRoutePath = path.resolve(process.cwd(), 'src/app/api/clinic-node/bundle/route.ts');

  it('validates scripts exist and are properly modularized under 350 lines', () => {
    expect(fs.existsSync(harvesterPath)).toBe(true);
    expect(fs.existsSync(uploaderPath)).toBe(true);
    expect(fs.existsSync(agentPath)).toBe(true);

    const harvesterLines = fs.readFileSync(harvesterPath, 'utf8').split('\n').length;
    const uploaderLines = fs.readFileSync(uploaderPath, 'utf8').split('\n').length;
    const agentLines = fs.readFileSync(agentPath, 'utf8').split('\n').length;

    expect(harvesterLines).toBeLessThanOrEqual(350);
    expect(uploaderLines).toBeLessThanOrEqual(350);
    expect(agentLines).toBeLessThanOrEqual(350);
  });

  it('verifies zip bundle includes s3-uploader.js, pacs-harvester.js, and storage-actions.js', () => {
    const files = getClinicHostFiles();
    expect(files).toContain('s3-uploader.js');
    expect(files).toContain('pacs-harvester.js');
    expect(files).toContain('pacs-query-helpers.js');
    expect(files).toContain('storage-actions.js');
  });

  it('validates keyword and modality filtering logic', () => {
    const syncRules = {
      allowedModalities: ['MR'],
      descriptionKeywords: ['brain', 'spine', 'ls spine', 'lumbar', 'cervical'],
      syncMode: 'auto_filtered',
    };

    function matchesRules(modality: string, description: string): boolean {
      const mod = modality.toUpperCase();
      if (!syncRules.allowedModalities.map((m) => m.toUpperCase()).includes(mod)) {
        return false;
      }
      if (syncRules.descriptionKeywords.length > 0) {
        const desc = description.toLowerCase();
        return syncRules.descriptionKeywords.some((kw) => desc.includes(kw));
      }
      return true;
    }

    // Should match
    expect(matchesRules('MR', 'MRI LS SPINE WITH CONTRAST')).toBe(true);
    expect(matchesRules('MR', 'BRAIN MRI')).toBe(true);
    expect(matchesRules('MR', 'MRI CERVICAL SPINE')).toBe(true);

    // Should reject non-MR
    expect(matchesRules('CT', 'CT BRAIN')).toBe(false);
    expect(matchesRules('CR', 'XRAY SPINE')).toBe(false);

    // Should reject non-matching keywords
    expect(matchesRules('MR', 'MRI KNEE JOINT')).toBe(false);
    expect(matchesRules('MR', 'MRI ABDOMEN')).toBe(false);
  });

  it('verifies HMIS_PACS query construction uses ModalitiesInStudy tag', () => {
    const helpersPath = path.resolve(hostDir, 'pacs-query-helpers.js');
    const combinedCode = fs.readFileSync(harvesterPath, 'utf8') + fs.readFileSync(helpersPath, 'utf8');
    expect(combinedCode).toContain('ModalitiesInStudy');
    expect(combinedCode).toContain('/modalities/HMIS_PACS/query');
    expect(combinedCode).toContain('/retrieve');
  });

  it('validates matchesSyncRules from pacs-query-helpers directly', () => {
    const { matchesSyncRules } = require(path.resolve(hostDir, 'pacs-query-helpers.js'));
    const rules = {
      allowedModalities: ['MR'],
      descriptionKeywords: ['spine'],
      bypassKeywords: false,
      syncMode: 'auto_filtered',
    };

    // Rejects CT
    expect(matchesSyncRules({ modality: 'CT', studyDescription: 'CT Spine' }, rules)).toBe(false);
    expect(matchesSyncRules({ modality: 'CT', studyDescription: 'CT Chest' }, rules)).toBe(false);

    // Rejects non-spine MR
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI Knee' }, rules)).toBe(false);
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI Brain' }, rules)).toBe(false);

    // Accepts MR Spine and shorthand variants
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI Lumbar Spine' }, rules)).toBe(true);
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI LS Spine' }, rules)).toBe(true);
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI Cervical Spine' }, rules)).toBe(true);
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI Dorsal Spine' }, rules)).toBe(true);

    // bypassKeywords: true accepts all MR
    const bypassRules = { ...rules, bypassKeywords: true };
    expect(matchesSyncRules({ modality: 'MR', studyDescription: 'MRI Knee' }, bypassRules)).toBe(true);
    expect(matchesSyncRules({ modality: 'CT', studyDescription: 'CT Chest' }, bypassRules)).toBe(false);
  });

  it('validates detectStudyModality accurately differentiates CT and MR even when DICOM tags are missing or mislabeled', () => {
    const { detectStudyModality } = require(path.resolve(hostDir, 'pacs-query-helpers.js'));

    // CT descriptions override empty or mislabeled DICOM modality
    expect(detectStudyModality('', 'CT KUB', 'PATIENT')).toBe('CT');
    expect(detectStudyModality('MR', 'CT KUB', 'PATIENT', 'MR')).toBe('CT');
    expect(detectStudyModality('', 'CT Brain Plain', 'PATIENT')).toBe('CT');
    expect(detectStudyModality('', 'HRCT Chest', 'PATIENT')).toBe('CT');
    expect(detectStudyModality('', 'CT STUDY', 'PATIENT')).toBe('CT');

    // MR descriptions override empty or mislabeled DICOM modality
    expect(detectStudyModality('', 'MRI Brain', 'PATIENT')).toBe('MR');
    expect(detectStudyModality('CT', 'MRI L/S Spine', 'PATIENT', 'CT')).toBe('MR');
    expect(detectStudyModality('', 'MRCP', 'PATIENT')).toBe('MR');
    expect(detectStudyModality('', 'MR Study', 'PATIENT')).toBe('MR');

    // Respects explicit DICOM modality when description is generic
    expect(detectStudyModality('CT', 'STUDY', 'PATIENT')).toBe('CT');
    expect(detectStudyModality('MR', 'STUDY', 'PATIENT')).toBe('MR');
    expect(detectStudyModality('MRI', 'DIAGNOSTIC SCAN', 'PATIENT')).toBe('MR');
  });
});
