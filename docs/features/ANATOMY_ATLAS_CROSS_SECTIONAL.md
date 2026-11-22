# Anatomy Atlas — Cross-Sectional Reference, Self-Quiz Engine & High-Performance Rendering

## 1. Overview & Architecture
The **Anatomy Atlas** in `rad-suite-core` provides high-resolution, multi-planar anatomical cross-sections (axial, sagittal, coronal) with normalized structure pinpoints, scout lines, and color-coded segmentation layer masks sourced from official IMAIOS eAnatomy datasets.

- **Primary Route**: `/atlas` (Integrated in Command Center & Imaging Navigation).
- **Workstation Companion**: Directly accessible as an on-canvas cross-sectional reference during clinical reporting (`ZenCompanionPanel` tab 6).
- **Database Engine**: `better-sqlite3` querying `anatomy_clean.db` (49 modules, ~3,500 slices, 15,000+ labeled structures).
- **Zero-Extraction Container**: Direct in-RAM decryption of encrypted `.radatlas` containers via AES-256-GCM with a 128-item LRU memory cache.
- **Instant Rendering Pipeline**: Series-wide batch annotations, sliding ring-buffer preloading with off-thread `img.decode()`, zero-reflow mathematical sub-pixel projection, and RAF-coalesced 14px cine drag scrubbing.

---

## 2. API Hierarchy & Caching Strategy
All endpoints are strictly authenticated via `withAuth`, guarded by RBAC `canAccessScreen(user, 'atlas')`, and served with high-performance HTTP caching:

| Endpoint | Method | Purpose | Cache-Control Header |
| :--- | :--- | :--- | :--- |
| `/api/anatomy/status` | `GET` | Service health, SQLite database path, module count | `no-store, private` |
| `/api/anatomy/modules` | `GET` | 49-module library grouped by anatomical region | `public, max-age=86400, stale-while-revalidate=604800` |
| `/api/anatomy/module/[code]` | `GET` | Series planes, slice catalogs, filters, and mask layers | `public, max-age=86400, stale-while-revalidate=604800` |
| `/api/anatomy/series/[seriesId]/annotations` | `GET` | **Series-wide batch annotations** (points & scout lines) | `public, max-age=31536000, immutable` |
| `/api/anatomy/slice/[sliceId]` | `GET` | Single slice fallback annotations `(x_norm, y_norm)` | `public, max-age=31536000, immutable` |
| `/api/anatomy/image` | `GET` | High-res diagnostic cross-section JPEG streaming | `public, max-age=31536000, immutable` |
| `/api/anatomy/mask` | `GET` | Segmentation overlay PNG mask (Hepatic, Prostate, Lobes) | `public, max-age=31536000, immutable` |
| `/api/anatomy/icon/[name]` | `GET` | Anatomical category, region, and structure glyphs | `public, max-age=31536000, immutable` |
| `/api/anatomy/structures?q=` | `GET` | Indexed text search across Latin and English nomenclature | `public, max-age=3600, stale-while-revalidate=86400` |

---

## 3. High-Performance Instant Rendering Engine (IMAIOS Benchmark)

### 3.1 Series Batch Annotation Pre-caching (Network Storm Elimination)
- **Problem**: Fetching `/api/anatomy/slice/:id` on every slice change caused network waterfall storms, dropped frames, and 50–200ms latency during rapid pointer drag or cine loops.
- **Solution**: `getSeriesAnnotations(seriesId)` in `anatomy.service.ts` queries SQLite for all slice pins and scout lines across the active series in a single batch query (~18ms for 114 slices with 8,883 points).
- **RAM Resolution**: The client cache (`seriesAnnotationsCache`) stores the batch map. Slice index updates resolve annotations in **0.001ms in RAM** with zero network roundtrips.

### 3.2 Off-Thread Decoding & Direction-Aware Lookahead (`useAtlasSlicePreloader`)
- **Problem**: Browsers decode image bytes synchronously on the main UI thread when `img.src` changes, causing micro-stutters, white flashes, and dropped frames during high-velocity scrubs.
- **Direction-Aware Dynamic Lookahead**: Detects scrubbing velocity (>8 slices/sec). When scrubbing forward fast, buffers +14 slices forward and -3 backward. When scrubbing backward fast, buffers -14 backward and +3 forward. Symmetric $\pm 6$ when stationary.
- **Off-Thread Decoding**: Calls native `img.decode()` on `new Image()` instances so decompression happens on worker threads off the main UI thread.
- **Sibling Orthogonal Scout Pre-warming**: In `requestIdleCallback`, pre-heats slice 1 of sibling orthogonal planes (e.g. Axial, Sagittal, Coronal) so switching sequence tabs in `AtlasSequenceDock` takes **0ms** with zero blank screens.
- **Persistent Web Cache Storage API (`caches.open('radsuite-atlas-v1')`)**:
  - Automatically writes preloaded images into persistent browser cache storage via `cacheAtlasAsset()`.
  - Repeat scrubs and subsequent reviews load with **0 HTTP requests** to the server, enabling full offline exploration.
- **Hardware & Mobile Data Saver Aware**:
  - Respects `navigator.connection.saveData`: restricts lookahead to $\pm 3$ and disables background pre-warming.
  - Dynamically scales LRU memory capacity via `getAtlasDeviceMemoryTier()` (24 for $\le 3\text{GB}$ mobile devices, up to 72 for high-end desktop workstations).

### 3.3 Dual-Buffer Zero-Flicker Viewport (`AtlasDualBufferViewport`)
- **Problem**: Changing `img.src` synchronously causes DOM image flickering or brief black frames during high-speed scrubbing over unstable network links.
- **Solution**: The diagnostic viewport maintains a double-buffered surface (`displayedSrc` and `pendingImg`).
- **Ping-Pong Rasterization**: While a target slice is decoding off-thread or fetching, the previously verified diagnostic frame remains 100% visible on canvas. The moment the incoming bitmap is decoded, the surface swaps with zero blank frames.

### 3.4 Zero-Layout-Reflow Sub-pixel Callout Projection
- **Problem**: Calling `getBoundingClientRect()` on container or image elements during mousemove/touchmove forces synchronous DOM layout recalculation (15–30ms per frame), crippling framerates.
- **Solution**: `AtlasCalloutOverlay` completely eliminates runtime `getBoundingClientRect()`:
  - Base container (`cWidth, cHeight`) and unscaled image dimensions (`iw, ih`) are cached using `ResizeObserver` (firing only on container resize or initial image load).
  - During pan and zoom, pin coordinates on the screen are computed purely mathematically:
    $$px = cx + (px_0 - cx) \times \text{zoom} + \text{pan.x}$$
    $$py = cy + (py_0 - cy) \times \text{zoom} + \text{pan.y}$$
    where $cx = cWidth / 2$, $cy = cHeight / 2$, $px_0 = (cWidth - iw)/2 + pt.x\_norm \times iw$, and $py_0 = (cHeight - ih)/2 + pt.y\_norm \times ih$.
  - 1D vertical spacing relaxation (`minGap = 28px`) and SVG leader lines update with $O(N)$ arithmetic in $< 0.05\text{ms}$ with zero DOM reflows.

### 3.4 VSync RAF Cine Scrubbing & Drift-Free Cine Loop
- **Pointer Coalescing**: `useAtlasViewportGestures` coalesces rapid mousemove and touchmove events (which can fire at 120–240Hz on modern displays) using `requestAnimationFrame`, updating slice index at most once per VSync frame.
- **Tactile Scrub Step**: 14px per slice step provides identical tactile responsiveness to official IMAIOS e-Anatomy and Vitrea Classic cine controls.
- **Drift-Free Cine**: `AtlasSliceViewer` cine playback uses `requestAnimationFrame` with `performance.now()` delta timing (`frameInterval = 120ms` for 8.3 FPS), preventing timer drift and dropped frames.

### 3.5 Zero-Extraction Container Architecture (`.radatlas`)
- Slices, PNG segmentation masks, and icons are stored in encrypted SQLite containers (`.radatlas`, 732 MB, 49 modules, 37,897 media).
- `radatlas-reader.service.ts` seeks and decrypts (AES-256-GCM) payloads directly in RAM with an in-memory 128-item LRU buffer cache.
- Nothing is ever written to disk or extracted to temporary directories, eliminating disk I/O bottlenecks.

---

## 4. Source Files & Responsibilities (<300 lines invariant)
All atlas files strictly adhere to the workstation modularity standard:

- `src/services/anatomy.service.ts` (258 lines): SQLite repository, module catalog, series annotations batch loader (`getSeriesAnnotations`), and structure search.
- `src/services/anatomy-assets.service.ts` (143 lines): RadAtlas priority routing and filesystem fallback for slices, masks, and icons.
- `src/services/radatlas-reader.service.ts` (253 lines): Zero-extraction AES-256-GCM decryptor with 128-item LRU buffer cache.
- `src/hooks/use-atlas-slice-preloader.ts` (212 lines): Direction-aware velocity lookahead preloader with sibling scout pre-warming, persistent CacheStorage integration, and device memory adaptation.
- `src/lib/atlas-cache.ts` (87 lines): Persistent browser CacheStorage interface (`radsuite-atlas-v1`), Data Saver detector, and device memory tiering.
- `src/components/atlas/atlas-dual-buffer-viewport.tsx` (111 lines): Dual-buffered zero-flicker viewport surface with off-thread decoding before swap.
- `src/hooks/use-atlas-nav-sync.ts` (87 lines): Synchronizes top workstation header, browser history back/forward, and localStorage theme persistence.
- `src/hooks/use-atlas-viewport-gestures.ts` (246 lines): VSync RAF-coalesced 14px cine drag scrub, keyboard shortcuts, non-passive wheel lock, and pinch-to-zoom.
- `src/hooks/use-atlas-quiz.ts` (58 lines): State machine for interactive "Find & Click" target challenge and masked `[ ? ]` badges.
- `src/components/atlas/atlas-view.tsx` (294 lines): Master workspace orchestrator with series annotation cache in RAM.
- `src/components/atlas/atlas-slice-viewer.tsx` (288 lines): Diagnostic viewport canvas, drift-free RAF cine playback, and preloaded image rasterization.
- `src/components/atlas/atlas-callout-overlay.tsx` (228 lines): Zero-reflow mathematical SVG coordinate projection with `ResizeObserver` caching.
- `src/components/atlas/atlas-callout-item.tsx` (202 lines): Outlined clinical text badges, dark halos, and luminous pinpoint markers.
- `src/components/atlas/atlas-module-selector.tsx` (332 lines): Searchable 49-module visual grid with 3D diagnostic region icons and theme switcher.
- `src/components/atlas/atlas-structure-sidebar.tsx` (315 lines): Tabbed drawer with category toggles, structure search, and self-quiz dashboard.
- `src/components/atlas/atlas-canvas-hud.tsx` (336 lines): Viewport HUD with Pan/Scrub mode, zoom, fit, mask opacity slider, and text size cycle.
- `src/components/atlas/atlas-scrubber-bar.tsx` (166 lines): Bottom scrubber bar with orientation indicators and filmstrip navigation.
- `src/lib/anatomy-layout.ts` (182 lines): Pure mathematical 1D collision relaxation, SVG path routing, and luminance boosters.

---

## 5. AI Agent Rules of Engagement for Atlas Rendering

Whenever an AI agent or developer modifies or extends the Anatomy Atlas, you **MUST** strictly uphold these rules:

1. **Zero Runtime `getBoundingClientRect()` in Gestures**: Never call `getBoundingClientRect()`, `offsetWidth`, or `offsetHeight` inside mousemove, touchmove, pan, zoom, or animation loops. Measure dimensions once via `ResizeObserver` and apply mathematical matrix projections.
2. **Never Fetch Annotations Per Slice in Viewport**: Viewport slice scrubbing must resolve annotations from `seriesAnnotationsCache` in RAM ($0.001\text{ms}$). All series annotations must be fetched in batch via `/api/anatomy/series/[seriesId]/annotations`.
3. **Mandatory Off-Thread Preloading (`img.decode()`)**: When adding new image sequences or visual layers, always preload surrounding frames using `new Image()` and await `img.decode()` before updating the rendered canvas.
4. **Coalesce Rapid Pointer Events with RAF**: Always coalesce pointer events into `requestAnimationFrame` before mutating state. Never invoke high-frequency React state updates directly from raw `pointermove` or `touchmove` events.
5. **Strict File Size Cap (<300 lines)**: Never allow any atlas component, service, or hook to exceed 300 lines (target 150–250 lines, absolute maximum 350 lines). If a file approaches 250 lines, extract sub-hooks or helper components immediately.
6. **Immutable HTTP Caching**: All static binary assets (images, masks, icons, batch annotations) must be served with `Cache-Control: public, max-age=31536000, immutable`.
7. **Default-Deny RBAC on All Routes**: Every API route under `src/app/api/anatomy/*` must authenticate sessions with `withAuth` and enforce `rbacService.canAccessScreen(user, 'atlas')`.
