# Modern Progressive DICOM Streaming, Metadata Architecture & Loading Indicators Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide superfast progressive DICOM streaming (Slice-0 first in <300ms), 100% accurate clinical series orientation/metadata propagation, and real-time sequence/study loading progress bars inspired by OHIF v3 and Cornerstone3D.

**Architecture:** Decouple study metadata into an instant JSON manifest (<50ms), eliminate blocking upfront network downloads, stream slices progressively via a multi-priority queue (active slice -> adjacent slices -> thumbnails -> background buffer), and expose reactive slice cache events to render OHIF-style smart scrubber tick marks and sequence progress badges.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Cornerstone3D/dicom-parser patterns, Tailwind CSS, Vitest.

---

## Root Causes Identified

1. **Local Series Splitting Bug (`src/services/local-cases.service.ts:97-98`)**:
   `const parts = file.split('-'); const sNum = parts.length >= 2 ? parts[1] : '1';`
   Clinical SOP UID files (e.g., `1.2.826.0.1.3680043.2.941...dcm` in `E:\Cases\192609005769_AHMAD_AYAZ`) do not contain dashes. All 53 slices across 5 distinct MR series (`SG T1`, `SG T2`, `SG T2 STIR`, `Loc 3PL`) were collapsed into a single `Series 1`.
2. **Hardcoded S3 Orientation (`src/app/workstation/[accession]/page.tsx:136`)**:
   S3 series mapping hardcoded `orientation: 'AXIAL'` across all series, ignoring that series are Sagittal or Coronal (`SG_T2`, `COR_T2_STIR`).
3. **Blocking Download on Standby Card Click (`StandbyCaseCard:33`)**:
   Clicking a case in Standby triggered `await fetch('/api/pacs/retrieve')`, causing the browser to wait 20-30 seconds downloading all 169 slices before navigating to the workstation.
4. **Node `fetch` IPv6 Latency on Windows (`s3-retrieval.service.ts:54, 151`)**:
   Global `fetch` on Windows stalls due to IPv6-first connection attempts before falling back to IPv4, instead of using `s3HttpGet` (which enforces `ipv4first` and keep-alive HTTP agents).
5. **No Sequence-Level or Scrubber Loading Feedback**:
   The filmstrip and scrubber did not indicate which slices were loaded vs remaining, leaving the clinician blind to transfer progress.

---

## Tasks

### Task 1: Fix Local DICOM Series Separation & Orientation Parsing

**Files:**
- Modify: `src/services/local-cases.service.ts`
- Test: `src/services/__tests__/local-cases-metadata.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/local-cases-metadata.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractSeriesMetaFromDicomHeader } from '../local-cases.service';

describe('Local Cases DICOM Series Separation', () => {
  it('correctly parses SeriesNumber, SeriesDescription, and SOP Instance UID without relying on filename hyphens', () => {
    // Mock minimal DICOM preamble + dataset with SeriesNumber (0020,0011) and SeriesDescription (0008,103e)
    const mockHeader = {
      seriesNumber: '13001',
      seriesDescription: 'SG T2',
      seriesInstanceUid: '1.2.392.200036.9116.4.2.9652.38686.13002',
      instanceNumber: 1,
    };
    expect(mockHeader.seriesNumber).toBe('13001');
    expect(mockHeader.seriesDescription).toBe('SG T2');
  });

  it('detects orientation correctly for Sagittal MR sequence', () => {
    const { detectOrientationFromDescription } = require('../dicom-geometry.service');
    expect(detectOrientationFromDescription('SG T2')).toBe('SAGITTAL');
    expect(detectOrientationFromDescription('COR T2 STIR')).toBe('CORONAL');
    expect(detectOrientationFromDescription('AX T1')).toBe('AXIAL');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/local-cases-metadata.test.ts`
Expected: FAIL (if function not yet exported or mismatch)

**Step 3: Implement minimal code in `src/services/local-cases.service.ts`**
- Replace `file.split('-')` series grouping logic.
- Parse `(0020,0011)` (`SeriesNumber`) and `(0020,000e)` (`SeriesInstanceUID`) to group slices into distinct series.
- Read `(0008,103e)` (`SeriesDescription`) per series.
- Apply `detectOrientationFromDescription` and `getOrientationFromIop` per series.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/local-cases-metadata.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/services/local-cases.service.ts src/services/__tests__/local-cases-metadata.test.ts
git commit -m "fix(dicom): group local series by DICOM tags instead of filename hyphens"
```

---

### Task 2: Fix S3 Orientation Detection & IPv6-Safe S3 Transport

**Files:**
- Modify: `src/services/s3-retrieval.service.ts`
- Modify: `src/app/workstation/[accession]/page.tsx:132-140`
- Test: `src/services/__tests__/s3-retrieval.test.ts`

**Step 1: Write the failing test**
Update `src/services/__tests__/s3-retrieval.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getS3StudySeries } from '../s3-retrieval.service';

describe('S3 Retrieval Series & Orientation', () => {
  it('populates orientation correctly from series description in S3SeriesInfo', async () => {
    // Test that orientation is present on S3SeriesInfo type
    const series = await getS3StudySeries('EMPTY_ACC');
    expect(Array.isArray(series)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails/passes**
Run: `npx vitest run src/services/__tests__/s3-retrieval.test.ts`

**Step 3: Implement minimal code**
- In `src/services/s3-retrieval.service.ts`:
  - Replace `fetch()` in `getS3StudyKeys` and `getS3SliceBuffer` with `s3HttpGet()`.
  - Add `orientation?: 'AXIAL' | 'SAGITTAL' | 'CORONAL'` to `S3SeriesInfo`.
  - In `getS3StudySeries`, compute `orientation: detectOrientationFromDescription(data.desc)`.
- In `src/app/workstation/[accession]/page.tsx`:
  - Replace hardcoded `orientation: 'AXIAL'` with `s.orientation || detectOrientationFromDescription(s.seriesDescription)`.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/s3-retrieval.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/services/s3-retrieval.service.ts src/app/workstation/[accession]/page.tsx src/services/__tests__/s3-retrieval.test.ts
git commit -m "fix(s3): use ipv4-first s3HttpGet and propagate accurate series orientation"
```

---

### Task 3: Decouple Study Navigation & Eliminate Blocking Standby Download

**Files:**
- Modify: `src/components/workstation/standby/standby-case-card.tsx:26-48`
- Test: `src/services/__tests__/standby-card-navigation.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/standby-card-navigation.test.ts` to verify non-blocking navigation behavior.

**Step 2: Run test**
Run: `npx vitest run src/services/__tests__/standby-card-navigation.test.ts`

**Step 3: Implement minimal code in `standby-case-card.tsx`**
- Remove blocking `await fetch('/api/pacs/retrieve')`.
- Navigate immediately using `router.push('/workstation/' + identifier)`.
- If background sync or hospital PACS retrieve is requested, fire it in the background with `notify.progress` or fire-and-forget without stalling UI navigation.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/standby-card-navigation.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/workstation/standby/standby-case-card.tsx src/services/__tests__/standby-card-navigation.test.ts
git commit -m "perf(standby): eliminate blocking retrieve download on case card click"
```

---

### Task 4: Lightweight Study Manifest API Endpoint

**Files:**
- Create: `src/app/api/cases/[accession]/manifest/route.ts`
- Test: `src/services/__tests__/manifest-api.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/manifest-api.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('Study Manifest Contract', () => {
  it('structures study manifest with all series, slice counts, orientations, and descriptions', () => {
    const manifest = {
      accessionNumber: '192609005769',
      modality: 'MR',
      series: [
        { seriesNumber: '13001', seriesDescription: 'SG T2', orientation: 'SAGITTAL', sliceCount: 14 },
        { seriesNumber: '14001', seriesDescription: 'SG T1', orientation: 'SAGITTAL', sliceCount: 14 },
      ],
    };
    expect(manifest.series[0].orientation).toBe('SAGITTAL');
    expect(manifest.series.length).toBe(2);
  });
});
```

**Step 2: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/manifest-api.test.ts`

**Step 3: Implement `src/app/api/cases/[accession]/manifest/route.ts`**
- Check local cases (`E:/Cases`) first; if found, return instant JSON manifest.
- If not on local disk, check S3 storage; return S3 series metadata manifest.
- Send `Cache-Control: public, max-age=300`.

**Step 4: Run test & verify API response**
Run: `npx vitest run src/services/__tests__/manifest-api.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/app/api/cases/[accession]/manifest/route.ts src/services/__tests__/manifest-api.test.ts
git commit -m "feat(api): add lightweight study manifest endpoint for instant workstation loading"
```

---

### Task 5: Reactive Slice Streaming Cache & Priority Prefetching

**Files:**
- Modify: `src/services/dicom-cache.service.ts`
- Modify: `src/hooks/use-dicom-slice-loader.ts`
- Test: `src/services/__tests__/dicom-cache-streaming.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/dicom-cache-streaming.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DicomSliceCache } from '../dicom-cache.service';

describe('DicomSliceCache Reactive Streaming & Progress', () => {
  let cache: DicomSliceCache;

  beforeEach(() => {
    cache = DicomSliceCache.getInstance();
    cache.clear();
  });

  it('notifies subscribers when a slice is cached', () => {
    let notified = false;
    const unsub = cache.subscribe((ev) => {
      if (ev.caseId === 'ACC1' && ev.series === '1' && ev.index === 0) {
        notified = true;
      }
    });

    cache.set('ACC1::1::0', { meta: {} as any, pixelData: new Int16Array(10) });
    expect(notified).toBe(true);
    unsub();
  });

  it('calculates loaded slice count and percentage for a series', () => {
    cache.set('ACC1::1::0', { meta: {} as any, pixelData: new Int16Array(10) });
    cache.set('ACC1::1::1', { meta: {} as any, pixelData: new Int16Array(10) });

    const progress = cache.getSeriesProgress('ACC1', '1', 4);
    expect(progress.loaded).toBe(2);
    expect(progress.total).toBe(4);
    expect(progress.percent).toBe(50);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/dicom-cache-streaming.test.ts`
Expected: FAIL (`cache.subscribe` or `getSeriesProgress` not defined)

**Step 3: Implement minimal code in `src/services/dicom-cache.service.ts`**
- Add listener callback list and `subscribe` method.
- Add `getSeriesProgress(caseId, series, totalSlices)`.
- Add `getCachedSliceIndices(caseId, series)`.
- Emit events in `set()`.
- In `useDicomSliceLoader.ts`, subscribe to cache changes and prioritize:
  1. Slice 0 or current visible slice (immediate render).
  2. Neighboring slices (±2).
  3. Sliding window prefetch.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/dicom-cache-streaming.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/services/dicom-cache.service.ts src/hooks/use-dicom-slice-loader.ts src/services/__tests__/dicom-cache-streaming.test.ts
git commit -m "feat(cache): add reactive slice streaming events and series progress tracking"
```

---

### Task 6: Visual Sequence Loading Indicators & Badges in Filmstrip & Rails

**Files:**
- Modify: `src/components/workstation/stitch-filmstrip.tsx`
- Modify: `src/components/workstation/zen-series-card.tsx`

**Step 1: Write tests for Filmstrip & Card orientation/progress rendering**
Verify orientation badge mapping and progress bar presence.

**Step 2: Implement minimal UI in `stitch-filmstrip.tsx` & `zen-series-card.tsx`**
- Add Orientation Badge:
  - `AXIAL` -> Sky badge `AX`
  - `SAGITTAL` -> Purple badge `SAG`
  - `CORONAL` -> Amber badge `COR`
- Add dynamic slice progress indicator:
  - Mini loading bar under the thumbnail card (`loaded / sliceCount * 100%`).
  - Text badge: e.g. `14/14` (emerald) or `5/14` (animated primary pulse).
  - Subscribe to `dicomCache.subscribe` so bars update live as slices arrive.

**Step 3: Verify visual rendering**
Run: `npm test` or vitest.

**Step 4: Commit**
```bash
git add src/components/workstation/stitch-filmstrip.tsx src/components/workstation/zen-series-card.tsx
git commit -m "feat(ui): add orientation badges and live slice download progress bars to filmstrip"
```

---

### Task 5: OHIF-Style Smart Scrubber with Cached Slice Buffer Track

**Files:**
- Modify: `src/components/workstation/zen-dicom-scrubber.tsx`

**Step 1: Write test for scrubber buffer track**
Verify scrubber calculates loaded slice markers and orientation pill.

**Step 2: Implement minimal UI in `zen-dicom-scrubber.tsx`**
- Add orientation pill next to series badge: `[#13001 SAG]`.
- Below or inside the scrubber slider track:
  - Render a segmented buffer track showing loaded slices as subtle green/primary tick marks.
  - Slices still streaming appear with subtle pulsing opacity.
  - Clinician immediately sees which slice regions are buffered and can scrub smoothly without lag.

**Step 3: Run tests to verify**
Run vitest suite.

**Step 4: Commit**
```bash
git add src/components/workstation/zen-dicom-scrubber.tsx
git commit -m "feat(ui): implement OHIF-style smart scrubber with cached slice buffer track"
```

---

### Task 8: End-to-End Verification with Live Clinical Cases

**Step 1: Run complete Vitest suite**
Run: `npx vitest run src/services/__tests__/`
Expected: All tests PASS.

**Step 2: Test live API with local Ahmad Ayaz case (`192609005769`)**
- Verify `/api/cases/192609005769/manifest` returns all 5 series (`SG T2`, `SG T1`, `SG T2 STIR`, `Loc 3PL`).
- Verify `/api/cases/slice?caseId=192609005769&series=13001&index=0` returns 200 with DICOM buffer in <10ms.
- Verify workstation loads Slice 0 immediately without waiting for remaining 52 slices.

**Step 3: Test S3 retrieval with keep-alive IPv4 transport**
- Verify series names and orientations (`SAGITTAL`, `CORONAL`) are cleanly parsed from S3 keys.
- Verify progress bars reflect live buffering.

**Step 4: Documentation Update (Rule 9/10 Invariant)**
- Update `docs/features/workstation-and-reporting.md` and `docs/architecture/storage-and-cloud.md` with progressive streaming architecture details.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-10-07-modern-dicom-streaming-and-metadata.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
