import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findDriveFolder,
  createDriveFolder,
  findOrCreateFolder,
  ensureClinicalTaxonomyFolders,
} from '../google-drive-folder.service';

describe('Google Drive Clinical Taxonomy Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('finds existing folder via Drive API search query', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ id: 'found-folder-id', name: 'CT' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const folderId = await findDriveFolder('mock-token', 'CT', 'parent-123');
    expect(folderId).toBe('found-folder-id');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("name%20%3D%20'CT'"),
      expect.objectContaining({ headers: { Authorization: 'Bearer mock-token' } })
    );
  });

  it('creates a new folder when not found', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-folder-id' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const createdId = await createDriveFolder('mock-token', 'MRI', 'parent-year-id');
    expect(createdId).toBe('new-folder-id');
  });

  it('resolves hierarchical Year -> Month -> Modality taxonomy structure', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      // Find queries return empty, then create queries return generated folder IDs
      if (opts?.method === 'POST') {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: `folder-level-${callCount}` }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ files: [] }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await ensureClinicalTaxonomyFolders('mock-token', {
      modality: 'CT',
      studyDate: '2026-10-04',
      rootFolderName: 'Rad Suite Reports',
    });

    expect(res.rootFolderId).toBeDefined();
    expect(res.yearFolderId).toBeDefined();
    expect(res.monthFolderId).toBeDefined();
    expect(res.modalityFolderId).toBeDefined();
    expect(callCount).toBe(4); // 4 levels created: root, year, month, modality
  });
});
