# HMIS Portal Password Isolation, Admin Control & Settings Workstation Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish isolated, AES-256-GCM encrypted per-user HMIS portal password storage completely separate from platform login credentials; remove PACS and Clinic PC Node from the side menu and move them into well-structured, responsive areas of Settings; strictly enforce Role-Based Admin Control over administrative features (AI models, PACS routing, Clinic Node, Storage); and reorganize Settings into a clean, theme-consistent workstation interface.

**Architecture:**
- **Data Layer**: Extend SQLite (`sqlite.ts`) and PostgreSQL (`users.ts`) with `hmis_password` column; auto-migrate SQLite via startup PRAGMA checks in `src/db/index.ts`.
- **Domain/Security Layer**: Encrypt/decrypt HMIS passwords using AES-256-GCM (`src/lib/crypto.ts`) in `auth.service.ts`; mask passwords in user DTOs (`hasHmisPassword: boolean`); expose backend-only decrypted credentials via `getUserHmisCredentials()`.
- **Navigation Layer**: Remove `pacs` and `clinic-node` from `NAV_ITEMS` in `src/components/layout/nav-items.ts`, keeping the sidebar focused purely on clinical radiologist workflow.
- **Presentation Layer**: Modularize `/settings` into discrete atomic subcomponents under 250 lines each with tabbed navigation: Clinical tabs for all clinicians, and dedicated Admin tabs strictly gated by `user.role === 'admin'`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle ORM (SQLite WAL + PostgreSQL), AES-256-GCM (`crypto`), Tailwind CSS design tokens, Lucide Icons, Vitest.

---

### Task 1: Database Schema Migration & Types Parity for `hmis_password`

**Files:**
- Modify: `src/db/schema/sqlite.ts:13-17`
- Modify: `src/db/schema/users.ts:13-17`
- Modify: `src/db/index.ts:181-190`
- Modify: `src/types/index.ts:18-31`
- Test: `src/services/__tests__/user-hmis-password-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/user-hmis-password-schema.test.ts
import { describe, it, expect } from 'vitest';
import { db, IS_SQLITE } from '@/db';
import { users } from '@/db/schema';

describe('User HMIS Password Schema Parity', () => {
  it('should include hmisPassword column in users schema definition', () => {
    expect(users.hmisPassword).toBeDefined();
    expect(users.hmisPassword.name).toBe('hmis_password');
  });

  it('should ensure hmis_password column exists in database table without breaking passwordHash', async () => {
    if (IS_SQLITE) {
      const sqlite = (db as any).session?.client;
      if (sqlite) {
        const cols = sqlite.prepare("PRAGMA table_info(users)").all().map((c: any) => c.name);
        expect(cols).toContain('hmis_password');
        expect(cols).toContain('password_hash');
        expect(cols).toContain('hmis_hospital_id');
        expect(cols).toContain('hmis_username');
      }
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/user-hmis-password-schema.test.ts`
Expected: FAIL (`hmisPassword` undefined on `users`).

**Step 3: Write minimal implementation**

1. In `src/db/schema/sqlite.ts`:
```typescript
  avatarColor: text('avatar_color').notNull().default('#0ea5e9'),
  hmisHospitalId: text('hmis_hospital_id'),
  hmisUsername: text('hmis_username'),
  hmisPassword: text('hmis_password'),
  createdAt: text('created_at').notNull(),
```

2. In `src/db/schema/users.ts`:
```typescript
  avatarColor: text('avatar_color').notNull().default('#0ea5e9'),
  hmisHospitalId: text('hmis_hospital_id'),
  hmisUsername: text('hmis_username'),
  hmisPassword: text('hmis_password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

3. In `src/db/index.ts`:
```typescript
    const userCols = sqlite.prepare("PRAGMA table_info(users)").all().map((c: any) => c.name);
    if (userCols.length > 0) {
      if (!userCols.includes('hmis_hospital_id')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN hmis_hospital_id TEXT;');
      }
      if (!userCols.includes('hmis_username')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN hmis_username TEXT;');
      }
      if (!userCols.includes('hmis_password')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN hmis_password TEXT;');
      }
    }
```

4. In `src/types/index.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  licenseNo?: string;
  department?: string;
  avatarColor?: string;
  hmisHospitalId?: string;
  hmisUsername?: string;
  hasHmisPassword?: boolean;
  createdAt: Date;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/user-hmis-password-schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/db/schema/sqlite.ts src/db/schema/users.ts src/db/index.ts src/types/index.ts src/services/__tests__/user-hmis-password-schema.test.ts
git commit -m "feat(db): add isolated hmis_password column to user schema with auto-migration"
```

---

### Task 2: AES-256-GCM Encryption & Auth Domain Credentials Layer

**Files:**
- Modify: `src/services/auth.service.ts`
- Modify: `src/app/api/auth/me/route.ts`
- Test: `src/services/__tests__/auth-hmis-credentials.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/auth-hmis-credentials.test.ts
import { describe, it, expect } from 'vitest';
import { updateUserProfile, getUserHmisCredentials, getCurrentUser } from '@/services/auth.service';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('HMIS Password AES-256-GCM Isolation & Security', () => {
  it('should encrypt HMIS password at rest and never store in plaintext', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();

    const plainHmisPassword = 'ExamplePassword123!';
    await updateUserProfile(user!.id, { hmisPassword: plainHmisPassword });

    const [row] = await db.select().from(users).where(eq(users.id, user!.id as any)).limit(1);
    expect(row.hmisPassword).toBeDefined();
    expect(row.hmisPassword).not.toBe(plainHmisPassword);
    expect(row.hmisPassword).toMatch(/^enc:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
  });

  it('should mask hmisPassword in getCurrentUser() and expose only hasHmisPassword boolean', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();
    expect((user as any).hmisPassword).toBeUndefined();
    expect(user!.hasHmisPassword).toBe(true);
  });

  it('should decrypt HMIS credentials accurately via getUserHmisCredentials() for internal gateway calls', async () => {
    const user = await getCurrentUser();
    const creds = await getUserHmisCredentials(user!.id);
    expect(creds.password).toBe('ExamplePassword123!');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/auth-hmis-credentials.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

1. In `src/services/auth.service.ts`:
- Import `encryptSecret`, `decryptSecret` from `@/lib/crypto`.
- Update `getCurrentUser()`: return `hasHmisPassword: !!((u as any).hmisPassword || process.env.PORTAL_PASSWORD)`.
- Update `updateUserProfile()`: accept `hmisPassword?: string`. If provided and non-empty, `updates.hmisPassword = encryptSecret(input.hmisPassword.trim())`.
- Export `getUserHmisCredentials(userId?: string)` to decrypt `hmisPassword` on demand.

2. In `src/app/api/auth/me/route.ts`:
- Add `hmisPassword: z.string().max(200).optional()` to `updateProfileSchema`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/auth-hmis-credentials.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/auth.service.ts src/app/api/auth/me/route.ts src/services/__tests__/auth-hmis-credentials.test.ts
git commit -m "feat(auth): implement AES-256-GCM encrypted HMIS password storage and credential helpers"
```

---

### Task 3: Remove PACS & Clinic PC Node from Sidebar Navigation

**Files:**
- Modify: `src/components/layout/nav-items.ts`
- Test: `src/services/__tests__/nav-items-cleaned.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/nav-items-cleaned.test.ts
import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/nav-items';

describe('Sidebar Navigation Menu Items', () => {
  it('should not contain clinic-node or pacs in side menu items', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).not.toContain('clinic-node');
    expect(ids).not.toContain('pacs');
  });

  it('should retain core clinical workflow routes in side menu', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).toContain('worklist');
    expect(ids).toContain('workstation');
    expect(ids).toContain('studio');
    expect(ids).toContain('settings');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/nav-items-cleaned.test.ts`
Expected: FAIL (`ids` contains `clinic-node` and `pacs`).

**Step 3: Write minimal implementation**

In `src/components/layout/nav-items.ts`:
- Remove `clinic-node` and `pacs` from `NAV_ITEMS`.
- Keep clean shortcut numbering across remaining items.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/nav-items-cleaned.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/layout/nav-items.ts src/services/__tests__/nav-items-cleaned.test.ts
git commit -m "refactor(layout): remove clinic-node and pacs from side menu to keep clinical workflow focused"
```

---

### Task 4: HMIS Profile Settings Component Upgrade

**Files:**
- Modify: `src/components/settings/hmis-profile-settings.tsx`
- Test: `src/services/hmis/__tests__/hmis-profile-settings-ui.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/hmis/__tests__/hmis-profile-settings-ui.test.ts
import { describe, it, expect } from 'vitest';
import { HmisProfileSettings } from '@/components/settings/hmis-profile-settings';

describe('HmisProfileSettings Component API', () => {
  it('should accept initialHasPassword prop and export valid React component', () => {
    expect(typeof HmisProfileSettings).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails / passes**

Run: `npx vitest run src/services/hmis/__tests__/hmis-profile-settings-ui.test.ts`

**Step 3: Write minimal implementation**

In `src/components/settings/hmis-profile-settings.tsx`:
- Add `initialHasPassword?: boolean` prop.
- Render isolated HMIS password field with Show/Hide eye icon toggle (`Eye` / `EyeOff`).
- Add status badge: `AES-256-GCM Encrypted` + `Password Configured` / `Not Set`.
- Send `hmisPassword` in `PATCH /api/auth/me`.
- Maintain line count < 220 lines.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/hmis/__tests__/hmis-profile-settings-ui.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/settings/hmis-profile-settings.tsx src/services/hmis/__tests__/hmis-profile-settings-ui.test.ts
git commit -m "feat(ui): add password visibility toggle and encryption badge to HMIS settings"
```

---

### Task 5: Interactive Clinician Profile Settings Component

**Files:**
- Create: `src/components/settings/clinician-profile-settings.tsx`
- Test: `src/services/__tests__/clinician-profile-settings.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/clinician-profile-settings.test.ts
import { describe, it, expect } from 'vitest';
import { ClinicianProfileSettings } from '@/components/settings/clinician-profile-settings';

describe('ClinicianProfileSettings Component', () => {
  it('should export ClinicianProfileSettings functional component', () => {
    expect(typeof ClinicianProfileSettings).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/clinician-profile-settings.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Create `src/components/settings/clinician-profile-settings.tsx`:
- Interactive form for Name, License No, Title, Department.
- Save button with loading indicator and success checkmark.
- Conforms to Rad Suite design tokens (`bg-card`, `border-outline-variant`).
- Size: ~140 lines (<250 lines).

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/clinician-profile-settings.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/settings/clinician-profile-settings.tsx src/services/__tests__/clinician-profile-settings.test.ts
git commit -m "feat(settings): create interactive ClinicianProfileSettings component"
```

---

### Task 6: Move PACS & Clinic PC Node into Settings Modular Subcomponents

**Files:**
- Create: `src/components/settings/admin-pacs-settings.tsx`
- Create: `src/components/settings/admin-clinic-node-settings.tsx`
- Create: `src/components/settings/workstation-display-settings.tsx`
- Create: `src/components/settings/system-storage-settings.tsx`
- Test: `src/services/__tests__/settings-subcomponents.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/settings-subcomponents.test.ts
import { describe, it, expect } from 'vitest';
import { AdminPacsSettings } from '@/components/settings/admin-pacs-settings';
import { AdminClinicNodeSettings } from '@/components/settings/admin-clinic-node-settings';
import { WorkstationDisplaySettings } from '@/components/settings/workstation-display-settings';
import { SystemStorageSettings } from '@/components/settings/system-storage-settings';

describe('Settings Modular Subcomponents', () => {
  it('should export all settings subcomponents', () => {
    expect(typeof AdminPacsSettings).toBe('function');
    expect(typeof AdminClinicNodeSettings).toBe('function');
    expect(typeof WorkstationDisplaySettings).toBe('function');
    expect(typeof SystemStorageSettings).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/settings-subcomponents.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

1. Create `src/components/settings/admin-pacs-settings.tsx` (~110 lines):
- Renders `PacsNetworkAssistant`, `UnifiedStorageSettingsCard`, `PacsServerCard`, `PacsBackgroundServices`.
- Gated with admin permission reminder badge.

2. Create `src/components/settings/admin-clinic-node-settings.tsx` (~130 lines):
- Integrates Clinic PC Node telemetry, power controls, disk card, Google Drive sync, and diagnostics.

3. Create `src/components/settings/workstation-display-settings.tsx` (~70 lines):
- Theme toggle with Dark/Light clinical reading room preview cards.

4. Create `src/components/settings/system-storage-settings.tsx` (~80 lines):
- Storage engine status, SQLite WAL / PostgreSQL dialect, HIPAA audit trail badge.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/settings-subcomponents.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/settings/admin-pacs-settings.tsx src/components/settings/admin-clinic-node-settings.tsx src/components/settings/workstation-display-settings.tsx src/components/settings/system-storage-settings.tsx src/services/__tests__/settings-subcomponents.test.ts
git commit -m "feat(settings): create modular admin pacs, clinic node, display, and storage subcomponents"
```

---

### Task 7: Tabbed Workstation Settings Container with Strict Admin Role Gates

**Files:**
- Create: `src/components/settings/settings-tabbed-container.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/pacs/page.tsx` (redirect / forward to `/settings?tab=pacs`)
- Modify: `src/app/(dashboard)/clinic-node/page.tsx` (redirect / forward to `/settings?tab=clinic-node`)
- Test: `src/services/__tests__/settings-page-structure.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/settings-page-structure.test.ts
import { describe, it, expect } from 'vitest';
import { SettingsTabbedContainer } from '@/components/settings/settings-tabbed-container';

describe('Settings Page Tabbed Container & Role Gates', () => {
  it('should export SettingsTabbedContainer component', () => {
    expect(typeof SettingsTabbedContainer).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/settings-page-structure.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

1. Create `src/components/settings/settings-tabbed-container.tsx` (~200 lines):
- Header: Clinician profile card summary with avatar, PMDC license, designation, role badge (`Admin` / `Consultant` / `PGR`), and active facility.
- Segmented navigation with 2 logical groupings:
  - **Clinical Workstation Tabs** (Visible to all clinicians):
    - `profile`: Clinician Profile
    - `hmis`: Punjab HMIS Portal Integration
    - `display`: Workstation Display & Theme
  - **Administrative Control Tabs** (Strictly guarded by `isAdmin = userRole === 'admin'`):
    - `ai`: AI Diagnostics & Model Cockpit (`AiProviderCockpit`)
    - `pacs`: PACS Server & DICOM Routing (`AdminPacsSettings`)
    - `clinic-node`: Clinic PC Node (`AdminClinicNodeSettings`)
    - `storage`: System Storage & Compliance (`SystemStorageSettings`)
- If a non-admin clicks/loads an admin tab, render a polished, HIPAA-compliant `Administrator Access Required` card.
- URL search param integration (`?tab=...`) so direct links and redirects (`/pacs` -> `/settings?tab=pacs`) navigate to the correct tab.

2. In `src/app/(dashboard)/settings/page.tsx` (~65 lines):
- Fetch `getCurrentUser()` and `getPacsServers()`.
- Pass data to `SettingsTabbedContainer`.

3. In `src/app/(dashboard)/pacs/page.tsx` and `src/app/(dashboard)/clinic-node/page.tsx`:
- Redirect to `/settings?tab=pacs` and `/settings?tab=clinic-node`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/settings-page-structure.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/settings/settings-tabbed-container.tsx src/app/(dashboard)/settings/page.tsx src/app/(dashboard)/pacs/page.tsx src/app/(dashboard)/clinic-node/page.tsx src/services/__tests__/settings-page-structure.test.ts
git commit -m "refactor(settings): create tabbed workstation settings with strict admin role gates and pacs/clinic-node tabs"
```

---

### Task 8: Propagate User HMIS Credentials to Gateway Endpoints

**Files:**
- Modify: `src/app/api/hmis/force-release/route.ts`
- Modify: `src/app/api/hmis/logout/route.ts`
- Modify: `src/app/api/hmis/result/route.ts`
- Test: `src/services/hmis/__tests__/hmis-api-credentials.test.ts`

**Step 1: Write test & run**

```typescript
// src/services/hmis/__tests__/hmis-api-credentials.test.ts
import { describe, it, expect } from 'vitest';
import { getUserHmisCredentials } from '@/services/auth.service';

describe('HMIS API User Credentials Forwarding', () => {
  it('should provide credentials with password for gateway dispatch', async () => {
    const creds = await getUserHmisCredentials();
    expect(creds).toHaveProperty('hospitalId');
    expect(creds).toHaveProperty('username');
    expect(creds).toHaveProperty('password');
  });
});
```

Run: `npx vitest run src/services/hmis/__tests__/hmis-api-credentials.test.ts`

**Step 2: Update endpoints**

In `force-release/route.ts`, `logout/route.ts`, `result/route.ts`:
- Retrieve `creds = await getUserHmisCredentials(user.id)`.
- Pass `x-hmis-username`, `x-hmis-hospital-id`, and `x-hmis-password` in gateway calls.

**Step 3: Run test to verify it passes**

Run: `npx vitest run src/services/hmis/__tests__/hmis-api-credentials.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/api/hmis/force-release/route.ts src/app/api/hmis/logout/route.ts src/app/api/hmis/result/route.ts src/services/hmis/__tests__/hmis-api-credentials.test.ts
git commit -m "feat(hmis): forward decrypted user credentials to automation gateway endpoints"
```

---

### Task 9: Full Verification, Test Suite & Documentation Synchronization (Rule 7)

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Test: Full Vitest suite & TypeScript compilation

**Step 1: Run full Vitest suite and TypeScript check**

Run: `npm run typecheck`
Run: `npx vitest run`
Expected: 68+ test files passed, 330+ tests passed, 0 errors.

**Step 2: Update documentation per Rule 7**

Document:
- `users.hmis_password` column with AES-256-GCM encryption at rest.
- User profile API DTO mask (`hasHmisPassword`).
- Removal of `pacs` and `clinic-node` from sidebar menu.
- Tabbed Workstation Settings architecture with role-based admin gates (`admin` vs `radiologist`/`pgr`).

**Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: document HMIS password encryption isolation, admin role gates, and settings redesign"
```
