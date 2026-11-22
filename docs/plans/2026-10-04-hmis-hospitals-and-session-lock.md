# HMIS Hospital Profile & Single-Session Collision Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Equip Rad Suite with automated Punjab HMIS single-device collision detection and 1-click remote session release on `http://localhost:3001/hmis`, along with a predefined 78-hospital registry persisted in SQLite/PostgreSQL and customizable in the radiologist's user profile/settings.

**Architecture:** 
Follows Rad Suite's strict 4-Layer Architecture and <250 lines per file constraint.
- **Layer 1 (Transport)**: `GET /api/hmis/hospitals`, `PATCH /api/auth/me` (profile preferences), and `POST /api/hmis/force-release` (remote session teardown).
- **Layer 2 (Domain/Services)**: `src/services/hmis/hmis-hospitals.data.ts` (typed 78-hospital registry), user profile update logic in `auth.service.ts`, and collision error detection in `session-manager.js`.
- **Layer 3 (Data)**: Parity across PostgreSQL (`users.ts`, `hmis.ts`) and SQLite (`sqlite.ts`, `db/index.ts`) for `hmisHospitalId`, `hmisUsername`, and the `hmis_hospitals` table with automatic idempotent seeding.
- **Layer 4 (Presentation)**: Modular `HmisSessionAlert` banner on `/hmis`, `HmisProfileSettings` card on `/settings`, and auto-populating credentials in `HmisGatewayMonitor`.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM (SQLite WAL + PostgreSQL), Playwright headless worker, Tailwind CSS v4 / semantic tokens, Vitest.

---

### Task 1: Predefined 78 HMIS Hospitals Domain Registry & Lookup Service

**Files:**
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\services\hmis\hmis-hospitals.data.ts`
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\services\hmis\__tests__\hmis-hospitals.test.ts`

**Step 1: Write the failing test**
Create `src/services/hmis/__tests__/hmis-hospitals.test.ts` testing:
- Exactly 78 hospitals in the registry.
- ID '19' resolves to 'Lahore General Hospital, Lahore'.
- ID '1' resolves to 'Bahawal Victoria Hospital, Bahawalpur'.
- ID '22' resolves to 'Jinnah Hospital, Lahore'.
- ID '116' resolves to 'Mianwali Teaching Hospital, Minawali'.
- `searchHmisHospitals("Lahore")` returns all teaching and specialized hospitals in Lahore.
- `searchHmisHospitals("Faisalabad")` returns Allied, Children, FIC, Allied-II, and FTH.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/hmis/__tests__/hmis-hospitals.test.ts`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**
Create `src/services/hmis/hmis-hospitals.data.ts` (<150 lines):
- Export `HMIS_HOSPITALS` typed array with all 78 entries `{ id: string, name: string }`.
- Export `getHmisHospitalById(id: string): { id: string, name: string } | undefined`.
- Export `searchHmisHospitals(query: string): Array<{ id: string, name: string }>`.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/hmis/__tests__/hmis-hospitals.test.ts`
Expected: PASS.

**Step 5: Commit**
`git add src/services/hmis/hmis-hospitals.data.ts src/services/hmis/__tests__/hmis-hospitals.test.ts`
`git commit -m "feat(hmis): add predefined 78 punjab hospitals dataset and lookup helpers"`

---

### Task 2: Database Schema Parity (Users & Hospitals Table) and Auto-Migration

**Files:**
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\types\index.ts`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\db\schema\users.ts`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\db\schema\hmis.ts`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\db\schema\sqlite.ts`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\db\index.ts`

**Step 1: Write the failing test**
Create test `src/services/__tests__/user-hmis-schema.test.ts` asserting:
- `users` table schema exports `hmisHospitalId` and `hmisUsername`.
- `hmisHospitals` (or `hmis_hospitals`) table schema exists.
- `db` can select seeded hospitals from SQLite.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/user-hmis-schema.test.ts`
Expected: FAIL (missing fields/tables).

**Step 3: Write minimal implementation**
1. In `src/types/index.ts`:
   Add `hmisHospitalId?: string;` and `hmisUsername?: string;` to `User` interface.
2. In `src/db/schema/users.ts` (PostgreSQL):
   Add `hmisHospitalId: text('hmis_hospital_id')` and `hmisUsername: text('hmis_username')`.
3. In `src/db/schema/hmis.ts` (PostgreSQL):
   Add `export const hmisHospitals = pgTable('hmis_hospitals', { id: text('id').primaryKey(), name: text('name').notNull() });`.
4. In `src/db/schema/sqlite.ts`:
   Add `hmisHospitalId` and `hmisUsername` to `users`.
   Add `export const hmisHospitals = sqliteTable('hmis_hospitals', { id: text('id').primaryKey(), name: text('name').notNull() });`.
5. In `src/db/index.ts`:
   Under SQLite runtime setup:
   - Check PRAGMA `table_info(users)` and run `ALTER TABLE users ADD COLUMN hmis_hospital_id TEXT;` and `ALTER TABLE users ADD COLUMN hmis_username TEXT;` if missing.
   - Create table `hmis_hospitals` if not exists.
   - Seed the 78 hospitals if `COUNT(*)` is 0.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/user-hmis-schema.test.ts`
Expected: PASS.

**Step 5: Commit**
`git add src/types/index.ts src/db/schema/ src/db/index.ts src/services/__tests__/user-hmis-schema.test.ts`
`git commit -m "feat(db): add hmis hospital and user profile preferences schema with sqlite migration"`

---

### Task 3: User Profile & Hospitals API Endpoints

**Files:**
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\app\api\hmis\hospitals\route.ts`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\services\auth.service.ts`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\app\api\auth\me\route.ts`
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\services\__tests__/profile-api.test.ts`

**Step 1: Write the failing test**
Create test `src/services/__tests__/profile-api.test.ts` asserting:
- `updateUserProfile(userId, { hmisHospitalId: '19', hmisUsername: 'dr_radiologist' })` updates user fields and returns updated user.
- `getCurrentUser()` returns `hmisHospitalId` and `hmisUsername`.
- Validation rejects invalid hospital ID or malformed strings.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/profile-api.test.ts`
Expected: FAIL (`updateUserProfile` is not a function).

**Step 3: Write minimal implementation**
1. In `src/services/auth.service.ts`:
   - Update `getCurrentUser()` projection and fallback to include `hmisHospitalId` and `hmisUsername`.
   - Add `updateUserProfile(userId: string, input: Partial<Pick<User, 'name' | 'licenseNo' | 'title' | 'department' | 'hmisHospitalId' | 'hmisUsername'>>)`:
     Updates database and logs audit event.
2. In `src/app/api/auth/me/route.ts`:
   - Add `PATCH` handler: validates input using Zod, updates profile, returns updated user.
3. In `src/app/api/hmis/hospitals/route.ts` (<50 lines):
   - `GET` handler: returns JSON array of 78 hospitals, supports optional `?q=` search filtering.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/profile-api.test.ts`
Expected: PASS.

**Step 5: Commit**
`git add src/services/auth.service.ts src/app/api/auth/me/route.ts src/app/api/hmis/hospitals/route.ts src/services/__tests__/profile-api.test.ts`
`git commit -m "feat(api): add hmis hospitals catalog and user profile preferences update api"`

---

### Task 4: Gateway Collision Detection & Unref Reaper Interval

**Files:**
- Modify: `d:\Projects\Rad-Reporting\rad-suite\hmis-gateway\src\core\session-manager.js`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\hmis-gateway\src\modules\auth\auth.controller.js`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\hmis-gateway\src\modules\auth\auth.routes.js`
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\app\api\hmis\force-release\route.ts`
- Create: `d:\Projects\Rad-Reporting\rad-suite\hmis-gateway\tests\unit\session-collision.test.js`

**Step 1: Write the failing test**
Create `hmis-gateway/tests/unit/session-collision.test.js` verifying:
- Error banner parser identifies "already logged in from another device" as a session collision.
- `force-release` route terminates context and submits portal `#logoutForm`.
- Interval is unref'd so Node.js process does not hang in tests.

**Step 2: Run test to verify it fails**
Run: `node --test hmis-gateway/tests/unit/session-collision.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**
1. In `hmis-gateway/src/core/session-manager.js`:
   - Add `if (this.reaperInterval.unref) this.reaperInterval.unref();` to allow clean test shutdown.
   - In `authenticate()`: Detect if error text contains `already logged in` or `another device`, and throw structured error `HMIS_SESSION_COLLISION: ${text.trim()}`.
   - Add method `forceRelease(sessionId)` that explicitly opens portal `/logout` or calls `#logoutForm.submit()`, purges cookies, and deletes session from map.
2. In `hmis-gateway/src/modules/auth/auth.controller.js` and `auth.routes.js`:
   - Add `POST /api/auth/force-release` triggering `forceRelease()`.
3. In `rad-suite/src/app/api/hmis/force-release/route.ts`:
   - Calls gateway `/api/auth/force-release` and returns status.

**Step 4: Run test to verify it passes**
Run: `node --test hmis-gateway/tests/unit/session-collision.test.js`
Expected: PASS.

**Step 5: Commit**
`git add hmis-gateway/src/ rad-suite/src/app/api/hmis/force-release/route.ts hmis-gateway/tests/unit/session-collision.test.js`
`git commit -m "feat(hmis-gateway): add session collision detection and force release endpoint"`

---

### Task 5: User Settings UI Component for Hospital & HMIS Profile Selection

**Files:**
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\components\settings\hmis-profile-settings.tsx`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\app\(dashboard)\settings\page.tsx`

**Step 1: Write the failing test / component test**
Create test `src/components/settings/__tests__/hmis-profile-settings.test.tsx` verifying:
- Renders hospital selector populated with 78 Punjab hospitals.
- Renders username input field.
- Dispatches save payload on form submit.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/components/settings/__tests__/hmis-profile-settings.test.tsx`
Expected: FAIL (component not found).

**Step 3: Write minimal implementation**
1. Create `src/components/settings/hmis-profile-settings.tsx` (<180 lines):
   - Client component featuring:
     - Searchable select/dropdown of 78 hospitals (with search filter input).
     - Pre-selects user's current `hmisHospitalId` (e.g. `19 - Lahore General Hospital, Lahore`).
     - Text input for `hmisUsername` (e.g. `dr_radiologist`).
     - Save button calling `PATCH /api/auth/me`.
     - Toast notification on success / error feedback.
2. In `src/app/(dashboard)/settings/page.tsx`:
   - Import and render `<HmisProfileSettings initialHospitalId={user?.hmisHospitalId} initialUsername={user?.hmisUsername} />` as a new card.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/components/settings/__tests__/hmis-profile-settings.test.tsx`
Expected: PASS.

**Step 5: Commit**
`git add src/components/settings/hmis-profile-settings.tsx src/app/(dashboard)/settings/page.tsx src/components/settings/__tests__/hmis-profile-settings.test.tsx`
`git commit -m "feat(settings): add hmis hospital selection and profile credentials settings card"`

---

### Task 6: Session Collision Alert Banner & 1-Click Release on `/hmis`

**Files:**
- Create: `d:\Projects\Rad-Reporting\rad-suite\src\components\hmis\hmis-session-alert.tsx`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\components\hmis\hmis-cockpit.tsx`
- Modify: `d:\Projects\Rad-Reporting\rad-suite\src\components\hmis\hmis-gateway-monitor.tsx`

**Step 1: Write the failing test**
Create test `src/components/hmis/__tests__/hmis-session-alert.test.tsx` verifying:
- Banner renders when `isCollision = true`.
- Displays collision message explaining Punjab single-session lock.
- "Force Release Session" button triggers release handler with loading state.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/components/hmis/__tests__/hmis-session-alert.test.tsx`
Expected: FAIL (component not found).

**Step 3: Write minimal implementation**
1. Create `src/components/hmis/hmis-session-alert.tsx` (<120 lines):
   - Renders a high-visibility warning card with `ShieldAlert` / `AlertTriangle` icon.
   - Text: "Active Session Conflict Detected: This account is currently logged into Punjab HMIS from another device or prior session."
   - Action: **"Force Release Session & Reconnect"** button invoking `POST /api/hmis/force-release` (or `/api/hmis/logout`).
   - Displays spinner during release, shows success toast, and notifies parent to reload state.
2. In `src/components/hmis/hmis-cockpit.tsx`:
   - Add `collisionState` (`{ detected: boolean, message?: string }`).
   - Wrap child action errors (from worklist, search, composer, or test auth) so if error message matches `/another device|already logged in|SESSION_COLLISION/i`, it sets `collisionState = { detected: true, message: err.message }`.
   - Render `<HmisSessionAlert ... />` directly above the tab panels whenever `collisionState.detected` is true.
3. In `src/components/hmis/hmis-gateway-monitor.tsx`:
   - Use current user's profile hospital ID and username as defaults in the credential tester form.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/components/hmis/__tests__/hmis-session-alert.test.tsx`
Expected: PASS.

**Step 5: Commit**
`git add src/components/hmis/hmis-session-alert.tsx src/components/hmis/hmis-cockpit.tsx src/components/hmis/hmis-gateway-monitor.tsx src/components/hmis/__tests__/hmis-session-alert.test.tsx`
`git commit -m "feat(hmis): add session collision alert banner and 1-click remote release to cockpit"`

---

### Task 7: Full Suite Verification & Architectural Compliance

**Files:**
- Test all vitest suites in `rad-suite`
- Verify line counts (<250 lines target, max 350 lines per file)
- Verify both Dark mode and Light mode rendering

**Step 1: Run full Vitest test suite**
Run: `npm test`
Expected: All 58+ test files pass.

**Step 2: Run TypeScript typecheck**
Run: `npm run typecheck`
Expected: 0 errors.

**Step 3: Run line count check**
Verify all modified and newly created files are under 350 lines.

**Step 4: Commit and finalize**
`git commit --allow-empty -m "chore(hmis): verify typecheck, tests, and architectural invariants for hmis profile and session lock"`
