# System Architecture & Core Invariants

Welcome to **Rad Suite**, a mission-critical radiology reporting workstation. This document defines the architectural foundations, folder boundaries, coding invariants, and multi-platform standards required across the codebase.

---

## 1. Architectural Modularity & File Size Invariant
- **Target Size**: Under 250 lines per file. Maximum allowed: 350 lines.
- **Rule**: If a file exceeds 350 lines, you MUST extract subcomponents, hooks, or helper utilities.
- **No Monolithic Files**: Do NOT bundle schemas, UI, and business logic together.

---

## 2. Strict 4-Layer Architecture
Rad Suite enforces a strict separation of concerns across four discrete layers:

```
[Layer 1: Transport (API Controllers)]
        │
        ▼
[Layer 2: Domain/Services (Pure Business Logic)]
        │
        ▼
[Layer 3: Data (Drizzle ORM & Models)]
        │
        ▲
[Layer 4: Presentation (Atomic UI & Feature Components)]
```

- **Layer 1 (Transport)**: `src/app/api/*` — Thin controllers ONLY. Validate request DTOs, authenticate sessions, check permissions, and delegate to Services.
- **Layer 2 (Domain/Services)**: `src/services/*` — Pure business logic, state machines, and calculations. No direct HTTP objects here.
- **Layer 3 (Data)**: `src/db/*` — Modular Drizzle schemas, typed models, and database dialect connectors.
- **Layer 4 (Presentation)**: `src/components/*` — Atomic UI primitives in `src/components/ui/`, feature modules in `src/components/{dicom,editor,intake,hmis,audit}/`.

---

## 3. Security & HIPAA Compliance Invariants
- **Session Security**: 256-bit cryptographic tokens stored in HttpOnly, SameSite=Lax, Secure cookies. Never store auth tokens in localStorage.
- **Input Validation**: EVERY mutating endpoint MUST parse payloads using Zod schemas (`src/lib/validation.ts`).
- **SQL Injection Prevention**: NEVER concatenate raw SQL strings. Always use Drizzle ORM query builders or parameterized sql tags.
- **Tamper-Evident Audit Trail**: Every access or change to Protected Health Information (PHI) MUST trigger `auditService.log()`.
- **Error Shielding**: NEVER leak raw SQL error strings, database paths, or stack traces to the client.

---

## 4. Multi-Platform Hardware Isolation
- Hardware APIs (Web Speech, Camera QR, Canvas WebGL, Audio) must be wrapped inside safe hooks (`src/hooks/*`) with `typeof window !== 'undefined'` guards so the codebase can compile seamlessly to Desktop (Tauri) and Mobile (Capacitor/PWA).

---

## 5. Theme Standard
- Use semantic Tailwind classes mapped to CSS variables (`bg-background`, `bg-card`, `text-foreground`, `border-border`).
- Always test components in BOTH Dark mode and Light mode.

---

## 6. Centralized Notification & Progress Service Architecture
Rad Suite provides a reactive pub/sub notification and progress dispatch service ([`src/services/notification.service.ts`](../../src/services/notification.service.ts)) to replace fragmented local alert banners and eliminate disruptive browser dialogs (`window.alert()`).

### Core Invariants:
1. **Zero Browser Alerts**: Never call `window.alert()` or `window.confirm()`.
2. **Global Reactive Host**: `<NotificationHost />` is mounted at the root (`src/app/layout.tsx`) and renders notifications via React 19's `useSyncExternalStore` hook without layout shift or UI freeze.
3. **Fire-and-Forget Background Tasks**: When initiating long-running or batch operations (such as saving HMIS drafts, batch claiming cases, exporting clinical archives, or syncing Google Docs), immediately return control to the workstation UI and spawn a persistent progress card via `notify.progress()`.

### API Quick Reference:
```typescript
import { notify } from '@/services/notification.service';

// 1. Toast Notifications (Auto-dismissing)
notify.success('Report saved as HMIS draft successfully');
notify.error('PACS connection timed out: AE Title RADIANT');
notify.warning('Please authorize and paste the code from Radiopaedia');
notify.info('Copied accession to clipboard');

// 2. Fire-and-Forget Background Task Tracking
const taskId = notify.progress({
  title: 'Saving HMIS Drafts',
  message: 'Initializing background session...',
  current: 0,
  total: 5,
});

// Update progress incrementally as steps complete
notify.updateProgress(taskId, {
  message: 'Saving case 1 of 5 (192610000850)...',
  current: 1,
});

// Complete or dismiss task
notify.dismiss(taskId);
```

---

## 7. Reusable UI Primitives & Design Consistency Invariant
To eliminate visual fragmentation, duplicate DOM wrappers, and inconsistent keyboard interactions, all feature modules MUST reuse foundational primitives located in `src/components/ui/`.

### Component Catalogue:
| Component Primitive | File Path | Usage & Purpose |
| :--- | :--- | :--- |
| `<Modal />` | [`src/components/ui/modal.tsx`](../../src/components/ui/modal.tsx) | Accessible dialog with ESC dismissal, backdrop blur, compound header, body, and footer. |
| `<Button />` | [`src/components/ui/button.tsx`](../../src/components/ui/button.tsx) | Theme-compliant action button with `primary`, `secondary`, `outline`, `ghost`, `danger`, `success` variants. |
| `<Card />` | [`src/components/ui/card.tsx`](../../src/components/ui/card.tsx) | Standard surface container with `<CardHeader>`, `<CardTitle>`, `<CardContent>`. |
| `<Input />` | [`src/components/ui/input.tsx`](../../src/components/ui/input.tsx) | Semantic form input with focus ring and dark/light borders. |
| `<Badge />` | [`src/components/ui/badge.tsx`](../../src/components/ui/badge.tsx) | Modality, priority, and clinical status pill badges. |
| `<CopyButton />` | [`src/components/ui/copy-button.tsx`](../../src/components/ui/copy-button.tsx) | Single-click clipboard copy button with checkmark feedback and toast notification. |
| `<TablePagination />` | [`src/components/ui/table-pagination.tsx`](../../src/components/ui/table-pagination.tsx) | Unified paginator for worklist and archive tables. |
| `<NotificationHost />` | [`src/components/ui/notification-host.tsx`](../../src/components/ui/notification-host.tsx) | Global viewport anchor for animated toast cards and live background progress cards. |

### Canonical Modal Standard:
Never construct bespoke `<div className="fixed inset-0 bg-black/...">` wrappers. Always use `<Modal>`:
```tsx
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';

<Modal isOpen={isOpen} onClose={onClose} size="md">
  <ModalHeader onClose={onClose}>
    <Icon className="w-5 h-5 text-primary" />
    <div>
      <ModalTitle>Dialog Title</ModalTitle>
      <ModalDescription>Sub-caption explaining clinical context</ModalDescription>
    </div>
  </ModalHeader>
  <ModalBody>
    {/* Body content */}
  </ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Confirm</Button>
  </ModalFooter>
</Modal>
```

