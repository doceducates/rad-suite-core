// Layer 4 (Presentation/Hooks): Worklist Client API Actions & Remote Execution
export async function executeClaimCase(accessionNumber: string): Promise<{ success: boolean; claim?: any; error?: string; code?: string }> {
  try {
    const res = await fetch(`/api/cases/${encodeURIComponent(accessionNumber)}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return { success: res.ok && data.success, claim: data.claim || data.data, error: data.error, code: data.code };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeBatchClaim(
  accessionNumbers: string[]
): Promise<{ success: boolean; claimed: any[]; conflicts: any[]; error?: string }> {
  try {
    const res = await fetch('/api/cases/batch-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessions: accessionNumbers }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, claimed: data.claimed || [], conflicts: data.conflicts || [] };
    }
    return { success: false, claimed: [], conflicts: [], error: data.error || 'Failed to batch claim' };
  } catch (err: any) {
    return { success: false, claimed: [], conflicts: [], error: err.message };
  }
}

export async function executeReleaseCase(
  accessionNumber: string,
  releaseCompanions = true
): Promise<{ success: boolean; releasedAccessions?: string[]; error?: string }> {
  try {
    const res = await fetch(`/api/cases/${encodeURIComponent(accessionNumber)}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ releaseCompanions }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      releasedAccessions: data.releasedAccessions || data.data?.releasedAccessions,
      error: data.error,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeBatchRelease(
  accessionNumbers: string[],
  releaseCompanions = true
): Promise<{
  success: boolean;
  released?: any[];
  conflicts?: any[];
  allReleasedAccessions?: string[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/cases/batch-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessions: accessionNumbers, releaseCompanions }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        released: data.released || [],
        conflicts: data.conflicts || [],
        allReleasedAccessions: data.allReleasedAccessions || accessionNumbers,
      };
    }
    if (!res.ok) {
      const released: any[] = [];
      const failed: any[] = [];
      const allAccs = new Set<string>();
      for (const acc of accessionNumbers) {
        const single = await executeReleaseCase(acc, releaseCompanions);
        if (single.success) {
          released.push({ accessionNumber: acc });
          (single.releasedAccessions || [acc]).forEach((a) => allAccs.add(a));
        } else {
          failed.push({ accessionNumber: acc, error: single.error });
        }
      }
      return {
        success: released.length > 0,
        released,
        conflicts: [],
        allReleasedAccessions: Array.from(allAccs),
        error: failed.length > 0 ? 'Some cases failed to release' : undefined,
      };
    }
    return { success: false, released: [], conflicts: [], error: data.error || 'Failed to batch release' };
  } catch (err: any) {
    return { success: false, released: [], conflicts: [], error: err.message };
  }
}

export async function executeStatusChange(
  reportId: string | undefined,
  studyId: string | undefined,
  newStatus: string,
  accessionNumber?: string
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const targetId = reportId || 'new';
    const res = await fetch(`/api/reports/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, studyId, accessionNumber }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, reportId: data.reportId, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeTrackCase(accessionNumber: string): Promise<{ success: boolean; tracking?: any; error?: string }> {
  try {
    const res = await fetch(`/api/cases/${encodeURIComponent(accessionNumber)}/track-sync`, {
      method: 'POST',
    });
    const data = await res.json();
    return { success: res.ok && data.success, tracking: data.tracking, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeBatchDelete(
  accessions: string[] = [],
  options?: { olderThanHours?: number; unassignedOnly?: boolean; preserveReported?: boolean }
): Promise<{ success: boolean; deletedCount?: number; skippedCount?: number; error?: string }> {
  try {
    const res = await fetch('/api/cases/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessions,
        olderThanHours: options?.olderThanHours,
        unassignedOnly: options?.unassignedOnly ?? true,
        preserveReported: options?.preserveReported ?? true,
      }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      deletedCount: data.deletedCount,
      skippedCount: data.skippedCount,
      error: data.error,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
