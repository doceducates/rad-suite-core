/**
 * Cross-platform DICOM slice buffer harvester (Tauri native zero-latency or HTTP API)
 */
export async function fetchSliceBuffer(
  caseId: string,
  series: string,
  index: number,
  filePath?: string,
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  if (
    typeof window !== 'undefined' &&
    Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__) &&
    filePath
  ) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke<number[] | Uint8Array>('read_local_dicom_file', { filePath });
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      return u8.buffer as ArrayBuffer;
    } catch {
      // Fall through to HTTP
    }
  }

  const endpoint = caseId.startsWith('share:')
    ? `/api/shares/${encodeURIComponent(caseId.slice(6))}/slice?series=${series}&index=${index}`
    : `/api/cases/slice?caseId=${encodeURIComponent(caseId)}&series=${series}&index=${index}`;

  const res = await fetch(endpoint, { signal });
  if (!res.ok) return null;
  return res.arrayBuffer();
}
