import { describe, it, expect } from 'vitest';
import { queryPacsDimse, echoPacsDimse } from '../pacs-dimse.service';

describe('PACS DIMSE Service', () => {
  it('handles echo cleanly', async () => {
    const result = await echoPacsDimse();
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  it('handles queryPacsDimse without throwing error', async () => {
    const result = await queryPacsDimse({ modality: 'MRI', dateRange: 'yesterday' });
    expect(Array.isArray(result)).toBe(true);
  }, 10000);
});
