/**
 * Smart Scrubber Buffer calculation service.
 * Computes loaded, missing slice intervals, and contiguous loaded ranges
 * for OHIF-style caching indicators with minimal DOM overhead.
 */

export interface ScrubberBufferStatus {
  loadedCount: number;
  totalCount: number;
  percent: number;
  isComplete: boolean;
  missingIndices: number[];
  loadedIndices: number[];
  loadedRanges: Array<{ start: number; end: number }>;
}

/**
 * Computes buffer completeness, missing slice indices, and contiguous ranges for the scrubber track.
 */
export function computeScrubberBuffer(
  cachedIndices: Set<number>,
  totalSlices: number
): ScrubberBufferStatus {
  const safeTotal = Math.max(0, totalSlices || 0);
  if (safeTotal === 0) {
    return {
      loadedCount: 0,
      totalCount: 0,
      percent: 0,
      isComplete: false,
      missingIndices: [],
      loadedIndices: [],
      loadedRanges: [],
    };
  }

  const loadedIndices: number[] = [];
  const missingIndices: number[] = [];
  const loadedRanges: Array<{ start: number; end: number }> = [];
  let currentRange: { start: number; end: number } | null = null;

  for (let i = 0; i < safeTotal; i++) {
    if (cachedIndices.has(i)) {
      loadedIndices.push(i);
      if (currentRange === null) {
        currentRange = { start: i, end: i };
      } else {
        currentRange.end = i;
      }
    } else {
      missingIndices.push(i);
      if (currentRange !== null) {
        loadedRanges.push(currentRange);
        currentRange = null;
      }
    }
  }

  if (currentRange !== null) {
    loadedRanges.push(currentRange);
  }

  const loadedCount = loadedIndices.length;
  const percent = Math.round((loadedCount / safeTotal) * 100);
  const isComplete = safeTotal > 0 && loadedCount >= safeTotal;

  return {
    loadedCount,
    totalCount: safeTotal,
    percent,
    isComplete,
    missingIndices,
    loadedIndices,
    loadedRanges,
  };
}
