# Notion-Style TipTap Editor Architecture & Reverse Engineering Reference

## 1. Overview & Motivation
To maximize clinical speed and ergonomic focus for radiologists drafting 20–30+ scans per shift, Rad Suite Core adapts the interaction patterns of Notion desktop:
1. **Left Gutter Handle (`+` and `⋮⋮`)**: Block creation and reordering without keyboard distraction.
2. **Right-Click Context Menu (`ClinicalContextMenu`)**: Fully responsive, scrollable context actions clamped within the viewport.
3. **Dual-Mode Right-Gutter Comments (`ClinicalBlockGutterComments`)**:
   - **Narrow Mode / Side Panel Open**: Block comment count badges `[💬 X]` + hover `[💬 Comment]` buttons.
   - **Wide Mode**: Pinned discussion cards in the right margin, vertically aligned with each commented block.
4. **Screenshot & PACS Image Attachments in Discussion**: Pasting images (`Ctrl+V`) or uploading lesion crops directly into comments.
5. **Floating Bubble "Skills" Suite**: Instant one-click clinical actions (*Improve writing*, *Proofread*, *Explain finding*, *Reformat*, *Suggest DDx*).
6. **Zero-Pollution HMIS Sanitizer**: Strips all internal discussion anchors and tags before transmitting drafts to Punjab HMIS.

---

## 2. Reverse-Engineered Notion Desktop Contracts (Zero-Disassembly Cache)

> [!NOTE]
> This section preserves the extracted schema and behavior from the local Notion desktop app (`com.notion.app.desktop.notion_7.42.3.0_x64__87smfmv0eebam`, `notion.db`), saving future agent sessions from running REA/PE disassembly.

### Notion SQLite Entities
- **Page / Block Entity (`block` table)**:
  - `id`: UUID (e.g. `41640a69-beec-80c0-a685-d150e0abcd52`)
  - `type`: `text`, `header`, `sub_header`, `sub_sub_header`, `numbered_list`, `bulleted_list`, `callout`
  - `properties.title`: Rich text AST array.
- **Inline Comment Markup AST**:
  ```json
  [
    [
      "Mild diffuse disc bulge with mild facet joint hypertrophy...",
      [["m", "41640a69-beec-808e-b809-001c8cb13c9b"]]
    ]
  ]
  ```
  `["m", discussion_id]` marks the anchor in rich text. In Rad Suite TipTap, this maps to:
  ```html
  <span data-comment-id="cmt_..." class="clinical-comment-mark">...</span>
  ```
- **Discussion Entity (`discussion` table)**:
  - `parent_id`: Block UUID
  - `context`: Exact snapshot of text when the discussion was initiated.
  - `comments`: Array of comment UUIDs.
- **Comment Entity (`comment` table)**:
  - `text`: Rich text comment body.
  - `created_by_id`: User UUID
  - `created_time`: Timestamp
  - `attachment`: Optional asset attachment URL.

---

## 3. Component Architecture & Responsibilities

| Component | File Path | Invariant Size | Description |
| :--- | :--- | :--- | :--- |
| **Gutter Comments** | `src/components/editor/clinical-editor/clinical-block-gutter-comments.tsx` | < 225 lines | Dual-mode right margin comments (Pills vs Pinned Cards) |
| **Context Menu** | `src/components/editor/clinical-editor/clinical-context-menu.tsx` | < 295 lines | Scrollable responsive right-click menu with Skills |
| **Floating Bubble** | `src/components/editor/clinical-editor/clinical-floating-bar.tsx` | < 275 lines | Text selection toolbar with Skills and Note trigger |
| **Comment Card** | `src/components/editor/clinical-editor/clinical-comment-card.tsx` | < 295 lines | Floating discussion card with `Ctrl+V` screenshot paste |
| **Empty Block AI** | `src/components/editor/clinical-editor/clinical-empty-space-ai.tsx` | < 160 lines | Spacebar trigger for instant clinical report starters |
| **Key Nav Extension** | `src/components/editor/clinical-editor/clinical-keyboard-nav.ts` | < 85 lines | TipTap keyboard handler for Tab, Esc, Spacebar AI |
| **Overlays Host** | `src/components/editor/clinical-editor/clinical-editor-overlays.tsx` | < 205 lines | High-performance overlay coordinator |

---

## 4. Dual-Mode Right-Gutter Comments System

```
                  ┌──────────────────────────────┐
                  │ Container Width Measurement  │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       Width >= 960px (Roomy)          Width < 960px (Narrow / Zen)
                 │                               │
  ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │ Pinned Cards in Right Margin │ │ Compact Pill Badges [💬 X]   │
  │ Vertically aligned to blocks │ │ Hover button: [💬 Comment]   │
  │ Displays text, author, files │ │ Click opens modal popover    │
  └──────────────────────────────┘ └──────────────────────────────┘
```

1. **Auto-Switching Threshold**:
   - `ResizeObserver` monitors the editor container. If width $\ge 960\text{px}$, margin cards appear pinned directly on the right.
   - If width $< 960\text{px}$ (e.g. Zen sidebar opened, 3-column stage, or tablet), it seamlessly collapses into compact badges (`[💬 1]`) and hover comment triggers.
2. **Screenshot / Attachment Pipeline**:
   - `handlePaste`: Listens for `clipboardData.items` containing `image/*`. Base64-encodes into `attachment.url` without hitting disk or external servers.
   - `FilePicker`: Accepts images or PACS crops.
   - Renders a compact thumbnail with a one-click remove `×` button.

---

## 5. Viewport-Clamped Responsive Context Menu & Right-Space Anchor

### Responsive Context Menu Geometry
The context menu automatically adjusts its dimensions to prevent screen overflow:
```typescript
const menuWidth = 240;
const maxMenuHeight = Math.min(480, viewportDims.height - 32);
const safeLeft = Math.max(12, Math.min(coords.x, viewportDims.width - menuWidth - 16));
const safeTop = Math.max(12, Math.min(coords.y, viewportDims.height - maxMenuHeight - 16));
```
With `maxHeight: ${maxMenuHeight}px` and `overflow-y-auto overscroll-contain`, the menu remains accessible on any screen resolution.

### Right-Side Free Space Comment Placement (`computeSmartCommentCoords`)
To ensure comments NEVER obscure clinical findings text:
1. **Desktop with Free Right Space (`spaceToRight >= 300px`)**:
   - `left = containerRect.right + 16px`: Comment cards float completely in the open margin to the right of the document (matching Notion).
   - `top`: Vertically aligned with the active commented line.
2. **Compact Viewport (`spaceToRight < 300px` but container >= 720px)**:
   - Docks to the inside right edge of the editor (`containerRect.right - 340px`).
3. **Mobile Screen (`window.innerWidth < 768px`)**:
   - Centers dynamically as a modal popover (`(windowWidth - 320) / 2`).

---

## 6. Multi-Comment Stacking, Voice Notes & Semantic Palettes

### 1. Gutter Quick-Add Interaction (`+` Badge)
- **Un-commented Blocks**: Hovering over any line in the text editor reveals a sleek pill badge `[+ 💬]` on the right edge of that line. Clicking it immediately opens the comment card for that block.
- **Commented Blocks**: Always displays the badge `[💬 X]` with the exact count of comments. On hover, a small circular `(+)` button appears alongside it to append an additional comment to the same block.

### 2. Multi-Comment Stacking & Click-to-Elevate
- When multiple comments exist for a block:
  - Cards stack with a slight negative margin (`marginTop: -24px`) and subtle scale down (`scale: 0.94 - 0.98`), providing an overlapping layered deck appearance.
  - Clicking any card elevates it to `zIndex: 50`, `scale: 1`, with active ring highlighting.
  - Clicking away or moving focus automatically returns the card to its natural stacked order without layout shifts.

### 3. Clinical Color Palettes
Notes are no longer restricted to yellow/amber. Five semantic color themes are supported:
- **Indigo (`indigo`)**: Default consultant discussion note (`bg-indigo-500/15`, `border-indigo-500/40`).
- **Teal (`teal`)**: Verified / MedGemma structured finding (`bg-teal-500/15`, `border-teal-500/40`).
- **Rose (`rose`)**: Urgent discrepancy / critical review note (`bg-rose-500/15`, `border-rose-500/40`).
- **Sky (`sky`)**: Peer note / general question (`bg-sky-500/15`, `border-sky-500/40`).
- **Amber (`amber`)**: Review / warning (`bg-amber-500/15`, `border-amber-500/40`).

### 4. Consultant Voice Dictation & Audio Media Engine
- **Hardware Isolation**: `useAudioRecorder` safely wraps the browser `MediaRecorder` API with channel optimization and noise suppression.
- **Industry Standard IDs**: Media is stored under `storage/media/audio/` with unique IDs formatted as:
  `rec_YYYYMMDD_HHMMSS_<shortid>.webm` (e.g. `rec_20261112_205501_a9f2bc.webm`).
- **Interactive Player**: Audio attachments render an inline player with play/pause, duration, and volume status.
- **Whisper / VoiceStudio Transcribe**: Clicking the `Transcribe` button sends the audio to `/api/ai/voicestudio` to transcribe speech directly into the comment text area.
- **Bottom Action Memo**: A dedicated `Audio Memo` button in the editor bottom action bar allows recording global case audio memos directly into `storage/media/audio/`.

---

## 7. HMIS Zero-Pollution Guarantee

Before saving reports or copying text to the clipboard for HMIS submission:
- `stripClinicalCommentMarks(html)` executes at the transport layer:
  ```typescript
  export function stripClinicalCommentMarks(html: string | null | undefined): string {
    if (!html || typeof html !== 'string') return '';
    return html.replace(/<span\s+[^>]*data-comment-id="[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  }
  ```
- **Invariant**: Internal discussion notes, comment timestamps, and attached PACS screenshots remain strictly in Rad Suite's local vault and NEVER pollute HMIS drafts.
