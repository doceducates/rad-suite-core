import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllTemplatesShared,
  getSharedDbTemplates,
  createSharedDbTemplate,
  updateSharedDbTemplate,
  deleteSharedDbTemplate,
  getTemplateCategoriesSummary,
} from '../templates-db.service';
import { sqlite } from '@/db';

describe('Shared Multi-User Templates Database Service', () => {
  beforeEach(() => {
    // Clean up test templates created during runs
    try {
      sqlite.prepare("DELETE FROM templates WHERE id LIKE 'test-%' OR id LIKE 'custom-%'").run();
    } catch {}
  });

  it('should return master templates combined with shared db templates', () => {
    const all = getAllTemplatesShared();
    expect(all.length).toBeGreaterThanOrEqual(78);
    const ct = all.filter((t) => t.modality === 'CT');
    const mri = all.filter((t) => t.modality === 'MRI');
    const usg = all.filter((t) => t.modality === 'USG');
    const xr = all.filter((t) => t.modality === 'X-Ray');

    expect(ct.length).toBeGreaterThanOrEqual(24);
    expect(mri.length).toBeGreaterThanOrEqual(43);
    expect(usg.length).toBe(7);
    expect(xr.length).toBe(4);
  });

  it('should create, update, and delete shared template accessible to all users', () => {
    const created = createSharedDbTemplate({
      name: 'USG Carotid Doppler (Normal)',
      modality: 'USG',
      subspecialty: 'Vascular',
      description: 'Bilateral extracranial carotid and vertebral arteries Doppler evaluation',
      technique: 'High-frequency linear colour and spectral Doppler ultrasound of bilateral carotid systems.',
      normalFindings: [
        'Right Carotid System: Normal caliber common, internal, and external carotid arteries with intact intimal-medial thickness. Normal triphasic and low-resistance flow waveforms. No plaque or stenosis.',
        'Left Carotid System: Intact carotid bulb, ICA, and ECA without luminal narrowing or hemodynamically significant flow acceleration.',
        'Vertebral Arteries: Bilateral vertebral arteries demonstrate antegrade flow with normal spectral velocity.',
      ],
      defaultImpression: 'Normal bilateral carotid and vertebral Doppler ultrasound study without evidence of atherosclerotic plaque or flow-limiting stenosis.',
      createdBy: 'Dr. Muhammad Mudassir',
    });

    expect(created.id).toBeTruthy();
    expect(created.isCustom).toBe(true);
    expect(created.normalFindings.length).toBe(3);

    // Verify it is returned in shared templates
    const shared = getSharedDbTemplates();
    const found = shared.find((t) => t.id === created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('USG Carotid Doppler (Normal)');
    expect(found?.createdBy).toBe('Dr. Muhammad Mudassir');

    // Update template
    const updated = updateSharedDbTemplate(created.id, {
      name: 'USG Carotid & Vertebral Doppler (Normal)',
      subspecialty: 'Neurovascular',
    });
    expect(updated).toBe(true);

    const reloaded = getSharedDbTemplates().find((t) => t.id === created.id);
    expect(reloaded?.name).toBe('USG Carotid & Vertebral Doppler (Normal)');
    expect(reloaded?.subspecialty).toBe('Neurovascular');

    // Delete template
    const deleted = deleteSharedDbTemplate(created.id);
    expect(deleted).toBe(true);
    expect(getSharedDbTemplates().find((t) => t.id === created.id)).toBeUndefined();
  });

  it('should generate category clusters including CT, MRI, USG, and X-Ray', () => {
    const categories = getTemplateCategoriesSummary();
    expect(categories.length).toBeGreaterThanOrEqual(4);

    const ctCat = categories.find((c) => c.id === 'CT');
    const mriCat = categories.find((c) => c.id === 'MRI');
    const usgCat = categories.find((c) => c.id === 'USG');
    const xrCat = categories.find((c) => c.id === 'X-RAY');

    expect(ctCat).toBeDefined();
    expect(ctCat?.count).toBeGreaterThanOrEqual(24);

    expect(mriCat).toBeDefined();
    expect(mriCat?.count).toBeGreaterThanOrEqual(43);

    expect(usgCat).toBeDefined();
    expect(usgCat?.count).toBe(7);

    expect(xrCat).toBeDefined();
    expect(xrCat?.count).toBe(4);
  });
});
