# Authentication, User Profiles & Role-Based Workstation Administration

This document specifies user authentication, dual-identifier resolution, case-sensitive username persistence, AES-256-GCM secret encryption, and role-based administration controls.

---

## 1. Multi-Identifier Authentication & Case-Sensitive Profile Persistence
- **Dual-Identifier Login Resolution**: Clinicians can log in using either their institutional email (`users.email`) or their official Punjab HMIS username (`users.hmis_username`). Case-insensitive SQL matching is enforced:
  ```typescript
  or(
    eq(sql`lower(${users.email})`, id.toLowerCase()),
    eq(sql`lower(${users.hmisUsername})`, id.toLowerCase())
  )
  ```
- **Exact Casing Invariant**: HMIS username casing (e.g., `dr_radiologist`) must be preserved in exact case across all database, DTO, and gateway header layers. Never force lowercase on stored usernames.
- **Database-First Fallback in Development**: In development mode or absence of an active session token, `getCurrentUser()` queries the active administrator record directly from the database to guarantee that profile updates (clinician name, title, license number, hospital ID, username) survive server restarts and test executions.
- **Test User Isolation**: Vitest test suites must never permanently pollute or mutate the live workstation administrator record. Suites modifying user fields must take snapshots and restore initial credentials in `afterAll()` lifecycle hooks.

---

## 2. External Credential Encryption (AES-256-GCM)
The external HMIS portal password and Google OAuth tokens are kept strictly separate from the Rad Suite platform bcrypt password (`password_hash`).
- Stored encrypted at rest via `encryptSecret()` in `users.hmis_password`, `users.google_refresh_token`, and `users.google_access_token`.
- Client DTOs (`/api/auth/me`, `/api/google/status`) expose only boolean connection masks (`hasHmisPassword: boolean`, `connected: boolean`); decrypted on the backend via helper functions (`getUserHmisCredentials()`, `getValidGoogleToken()`) for gateway and API automation only.

---

## 3. Role-Based Workstation Administration & Settings Architecture
- **Clinical Sidebar Focus**: Main sidebar navigation is reserved for daily radiologist reporting workflows (`Worklist`, `Workstation`, `Dictation Studio`, `Batch Reporting`, `Intake & OCR`, `Patient Records`, `HMIS Bridge`, `Settings`).
- **Unified Settings Workstation**: PACS server routing and Clinic PC Node management are consolidated into responsive, tabbed areas inside `/settings` instead of polluting the primary navigation.
- **Strict Role-Based Admin Controls**: All administrative features (AI Provider Cockpit / model setup, PACS SCP configuration, Clinic PC Node power & telemetry, database storage dialects) are strictly locked behind `user.role === 'admin'`. Non-admin radiologists and PGRs access only personal clinical credentials, HMIS integration, and display themes.
- **Clinician Designation & Dual Identity Support**: Clinicians who serve as system administrators retain full `admin` role capabilities while their clinical designation (e.g., `Resident Radiologist (PGR)`, `Senior Registrar`, `Consultant Radiologist`) is independently configured via `users.title`. All diagnostic signatures, HMIS draft attribution (`pgr_name` / `consultant_name`), and workstation status bars display the clinician's active clinical title rather than system role names.
- **Immediate Profile Synchronization**: Mutations to clinician profiles in `/settings` notify parent layout containers via reactive callbacks and dispatch `router.refresh()`, ensuring global headers, workstation sidebars, and local storage stay in lockstep without requiring full page reloads.

---

## 4. Google OAuth 2.0 Clinician Authentication & Desktop Handshake
Rad Suite provides first-class "Sign in with Google" and "Continue with Google" across Web and Desktop (Tauri/Electron) platforms.
- **Unified Identity & Storage Provisioning**: Signing in with Google automatically connects the clinician's Google Drive for personal case storage isolation (`docs/architecture/two-tier-pacs-ingestion.md`), eliminating manual token linkage steps.
- **Account Resolution & Registration**:
  - Existing users with matching `googleEmail` or registered institutional `email` are automatically identified, linked, and logged into their active workstation.
  - New clinicians are provisioned via Google OAuth:
    - If a valid `inviteCode` is provided, their account is immediately activated (`status: 'active'`) with permissions assigned from the invite code.
    - If no invite code is provided, the account is safely registered in `'waitlisted'` status and routed to `/pending-access`.
- **Universal Multi-Platform Handshake**:
  - **System Default Browser Desktop Flow**: When running in the desktop workstation (Tauri), clicking "Sign in with Google" launches the user's default system browser (Chrome/Edge) via native Tauri IPC (`open_in_browser`). This enables instant 1-click authentication using the user's existing logged-in browser session—eliminating the need to re-enter email, password, or 2FA credentials inside the app webview.
  - **Desktop Session Polling & Cookie Bridge**: The desktop app requests a cryptographically unique `desktopAuthId` via `/api/auth/desktop-session/init` and begins polling `/api/auth/desktop-session/poll`. When the browser completes authentication, the poll endpoint sets the HttpOnly `rad_suite_session` cookie directly in the desktop app's webview and automatically routes the clinician to `/worklist`.
  - **Desktop Deep Linking (`radsuite://`)**: As an instant return mechanism, the browser completion page automatically triggers `radsuite://auth/callback?token=${sessionToken}&status=${status}` and displays an "Open Rad Suite Desktop" action button.
  - **Desktop Bearer Token Authentication**: In addition to standard HttpOnly cookies, API handlers (`src/lib/auth-guard.ts`) accept `Authorization: Bearer <sessionToken>` headers, allowing native desktop and mobile clients to authenticate directly without browser cookie dependencies.

---

## 5. Unified RBAC & Alpha Early Access Lifecycle
Rad Suite uses a single, centralized Role-Based Access Control and Early Access engine (`src/services/rbac.service.ts`) across both Web and Desktop workstation builds.

- **Identical Cross-Platform Security Rules**:
  - No bifurcated or diverged permission checks between desktop apps and the web client.
  - `rbacService.hasPermission(user, permission)` governs all feature gates.
  - **Zero-Submit Hard Lock (Rule 5)**: `hmis_final_submit` evaluates strictly to `false` for every role (including system admins). Only local draft saves (`hmis_draft_sync`) are permitted.
- **Granular Feature Permissions**:
  - `clinical_reporting`: Diagnostic authoring, template population, and impression sign-off (Consultants, PGRs).
  - `hmis_draft_sync`: Safe local dispatch of draft findings to the hospital portal.
  - `lgh_lan_pacs`: Direct Gigabit LAN DIMSE C-FIND / C-GET against LGH PACS.
  - `google_drive_pacs`: Seamless personal case loading from linked Google Drive storage.
  - `cloud_vps_sync`: VPS hot-case staging (reserved for Admins during Alpha).
  - `clinical_ai_copilot`: Radiologist AI copilot (marked "under construction" for alpha users; enabled for Admin evaluation).
  - `manage_users` & `audit_trail`: Admin-only governance.
- **Early Access Lifecycle**:
  1. **Registration**: Clinicians request access at `/register` using either standard form or Google OAuth. Entering an alpha invite code instantly provisions an `active` account and routes to `/worklist`.
  2. **Waitlist Queue**: Registrations without an alpha invite code are safely saved in `status: 'waitlisted'` and redirected to `/pending-access`.
  3. **Activation Paths**:
     - **Self-Service Master Alpha Code**: Waitlisted users can redeem `LGH-ALPHA-2026` directly on `/pending-access` to instantly activate their account.
     - **Admin Unified 1-Click Approval**: System administrators are alerted by a prominent pending review badge and banner in `/users`. Admins can click "Approve Access" on any waitlisted clinician from both the **Clinicians & RBAC** tab and the **Alpha Waitlist** tab to immediately promote them to `active` status without requiring manual code entry.

---

## 6. Granular Storage Source-Level RBAC (`canAccessStorageSource`)
Diagnostic imaging data originates from diverse tiers with distinct network, privacy, and cost profiles. To prevent unauthorized cloud egress or raw hospital DIMSE scraping, storage access is strictly mediated by `rbacService.canAccessStorageSource(user, source)` and the `users.allowed_storage_sources` column:

- **Tier 1 — Local Workstation Storage (`local`, `local_archive`)**:
  - Unrestricted access for all active authenticated clinicians (`consultant`, `radiologist`, `pgr`, `resident`, `technologist`).
  - Zero-latency local workstation SSD/HDD storage (`C:\MedicalSandbox\Cases`).
- **Tier 2 — Personal Google Drive (`gdrive`)**:
  - Open to all active clinicians who authenticate or link their personal Google Workspace/Drive account.
  - Grants read/write access strictly to the clinician's own isolated folder tree (`Rad Suite Cases / YYYY / MM / MODALITY`), without cross-user data leakage.
- **Tier 3 — Central S3 Cloud Archive (`s3`)**:
  - **Restricted by default**. Accessible only to system `admin` users or clinicians with explicit `s3` grant in `allowed_storage_sources`.
  - Protects cloud egress bandwidth and maintains Ceph/S3 rate-limiting constraints.
- **Tier 4 — Hospital PACS Direct DIMSE Query (`pacs`, `hospital_pacs`)**:
  - **Restricted by default**. Requires explicit `pacs` permission.
  - Queries direct hospital PACS hardware (`10.0.0.100:8040`) using C-FIND / C-GET. Non-permitted users must consume pre-harvested local or cloud-staged studies.
- **Tier 5 — Remote Clinic PC Edge Nodes (`remote_node`)**:
  - **Admin-only by default**. Requires explicit `remote_node` permission.
  - Non-admin users are strictly forbidden from viewing edge node hostnames, daemon statuses (e.g., Orthanc STOPPED/RUNNING), or issuing remote actions.
- **Backend Query Enforcement**:
  - `unified-source-aggregator.service.ts` and `POST /api/pacs/query` inspect `canAccessStorageSource()` before initiating downstream socket or S3 connections.
  - Unauthorized queries automatically return an empty array without leaking infrastructure connectivity errors to the client.

---

## 7. Report Ownership & Clinical Claim State Machine (`canEditReport`)
To maintain medico-legal integrity, clinical audit trails, and prevent multi-radiologist collision, reporting permissions follow a strict ownership state machine:

- **Common Patient Readability**: All active clinical users can view all patient records, worklists, and finalized diagnostic reports across the hospital.
- **Exclusive Edit & Mutation Locking**:
  - A draft report can be edited **ONLY** if:
    1. The user has role `admin`, OR
    2. The study is claimed by the user (`study.assignedRadiologistId === user.id`), OR
    3. The report was authored by the user (`report.pgrAuthorId === user.id`), OR
    4. The report's signed attribution matches the user (`report.signedBy === user.name`), OR
    5. The study is unclaimed and unassigned (first doctor to open/edit claims the case).
- **Claim Lock Protection**:
  - When Radiologist A claims a case, it appears with a lock badge and Radiologist A's name for Radiologist B.
  - If Radiologist B attempts to mutate the report, the API rejects the request with HTTP `403 Forbidden` (`Case claimed by another clinician`).
  - Admins retain override and reassignment authority in `/worklist` via `POST /api/cases/[accession]/claim` and `POST /api/cases/[accession]/release`.

---

## 8. AI Agent & Developer Contract: Blueprint for Adding New Screens & Features

When building a new feature, screen, or integration in Rad Suite, **every developer and AI agent MUST follow this contract** to prevent unintended access, role leaks, and unshielded infrastructure exposure:

### Golden Rules for Future Features
1. **Default to Deny (Never Default to Open)**:
   - If a screen, storage source, or capability is not explicitly public, it MUST be restricted by default.
   - Any new infrastructure-touching screen (hardware monitors, node managers, cloud sync settings) MUST set `isRestrictedByDefault: true` in `ALL_SCREENS` and restrict access to `admin`.
2. **Server-Side Enforcement First (Never UI Hiding Only)**:
   - Never rely solely on hiding a button, tab, or menu item in the React presentation layer.
   - The underlying API route (`/api/*`) or Server Component (`page.tsx`) MUST independently verify authentication (`requireAuth`) and permissions (`rbacService.canAccessScreen` / `rbacService.canAccessStorageSource` / `rbacService.hasPermission`).
3. **Zero Infrastructure Exposure to Non-Admins**:
   - Non-admin clinicians must NEVER see edge node IDs (e.g., `node-desktop-513rn6h`), internal IP addresses (`10.0.0.100`), Orthanc service statuses, S3 bucket names, or API secret keys.
   - Always sanitize API responses and replace raw internal paths (`E:\Cases`) with generic clinical tokens (`Local Storage`).
4. **Absolute Zero-Submit Invariant (Punjab HMIS)**:
   - Any screen touching hospital reports MUST only trigger draft saves (`action: 'save'`). Final submission buttons (`action: 'submit'`) or reject actions must NEVER be added to DOM, network requests, or controller logic.

### 4-Layer Implementation Checklist

| Step | Layer | File / Location | Action Required |
| :--- | :--- | :--- | :--- |
| **1. Transport Guard** | Layer 1 | `src/app/api/.../route.ts` & `src/app/.../page.tsx` | - Call `await requireAuth(req)` in API routes or `await getCurrentUser()` in Page routes.<br>- If admin-only: call `await requireRole(['admin'], req)` or redirect to `/dashboard`.<br>- If screen-governed: evaluate `rbacService.canAccessScreen(user, screenId)`. |
| **2. RBAC Service Registry** | Layer 2 | `src/services/rbac.service.ts` | - Add screen definition to `ALL_SCREENS` with `id`, `name`, `href`, `category`.<br>- Set `isRestrictedByDefault: true` if sensitive or administrative.<br>- If adding a new capability, extend `FeaturePermission` union and update `hasPermission()`.<br>- If adding a storage adapter, update `canAccessStorageSource()`. |
| **3. DTO Shielding** | Layer 3 | `src/services/...` & `src/lib/validation.ts` | - Sanitize output DTOs. Never return unmasked credentials, API keys, or raw SQL errors.<br>- Validate incoming payloads with strict Zod schemas. |
| **4. Presentation & Nav** | Layer 4 | `src/components/layout/nav-items.ts` & UI components | - If linking in the sidebar, add `NavItemDef` to `NAV_ITEMS`. If admin-only, set `roles: ['admin']`.<br>- In workspace toolbars, dropdowns, and tabs, use `StandbySourceDropdown` or filter choices against `allowedStorageSources` / `userRole`. |

### Concise RBAC Permission Matrix

| Role | Core Clinical Screens (`worklist`, `workstation`, `my_cases`) | Direct Hospital PACS (`/pacs`, DIMSE) | Storage: Local & GDrive | Storage: S3 Cloud & Remote Nodes | System Admin (`/users`, `/audit`, Node Mgmt) | HMIS Draft Sync | HMIS Final Submit |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`admin`** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Draft Only | ❌ Locked (False) |
| **`consultant`** | ✅ Full | 🔒 Explicit Grant Only | ✅ Full | 🔒 Explicit Grant Only | ❌ Forbidden | ✅ Draft Only | ❌ Locked (False) |
| **`radiologist`** | ✅ Full | 🔒 Explicit Grant Only | ✅ Full | 🔒 Explicit Grant Only | ❌ Forbidden | ✅ Draft Only | ❌ Locked (False) |
| **`pgr` / `resident`** | ✅ Full | 🔒 Explicit Grant Only | ✅ Full | 🔒 Explicit Grant Only | ❌ Forbidden | ✅ Draft Only | ❌ Locked (False) |
| **`technologist`** | 👁️ Worklist / View | 🔒 Explicit Grant Only | ✅ Local Scan | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ❌ Locked (False) |
| **`service`** | ❌ (API Only) | ❌ (API Only) | ❌ (API Only) | 🔒 Service Token | ❌ Forbidden | ❌ Forbidden | ❌ Locked (False) |



