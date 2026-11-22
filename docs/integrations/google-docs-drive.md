# Google Docs & Drive Clinical Synchronization & Secure OAuth Architecture

This document specifies Google Docs and Google Drive clinical report synchronization, restricted OAuth 2.0 security scopes, folder hierarchies, and native document conversion.

---

## 1. Restricted OAuth 2.0 Scope (`drive.file`)
User-level Google Drive authentication operates strictly under `https://www.googleapis.com/auth/drive.file`. Rad Suite possesses zero access to existing files in the clinician's Drive outside of files created directly by the workstation.

---

## 2. AES-256-GCM Credential Encryption
Offline refresh tokens (`users.google_refresh_token`) and access tokens (`users.google_access_token`) are encrypted at rest using `encryptSecret()`. Never transmitted to client browsers; client session DTOs (`/api/auth/me`, `/api/google/status`) expose only boolean connection status, user email, and auto-sync setting.

---

## 3. Hierarchical Clinical Folder Taxonomy
Reports are auto-filed into a deterministic hierarchy on Google Drive:
```
Rad Suite Reports /
└── {YYYY} /
    └── {MM} - {MonthName} /
        └── {MODALITY} /
            └── [MODALITY] {ACCESSION} - {PATIENT_NAME}
```
Subfolder structures are lazily created and verified via `google-drive-folder.service.ts`.

---

## 4. High-Fidelity Native Google Doc Conversion
Reports are formatted into structured clinical HTML and converted to native Google Docs (`application/vnd.google-apps.document`) via multipart upload to Google Drive API v3. Preserves institution headers, patient demographics tables, clinical indication, technique, findings, impression, and electronic signature stamps.

---

## 5. Dual Synchronization Triggers
- **Manual 1-Click Sync & Direct Link**: Direct buttons in `ZenReportFooter` (Workstation) and `WorklistReportModalFooter` (Worklist) trigger `POST /api/reports/[id]/sync-google`, persisting `reports.google_doc_id`, `reports.google_doc_url`, and `reports.google_synced_at`. The 1-click "Docs" action opens the native document in a new tab.
- **Optional Auto-Sync on Final Sign-off**: When enabled in `/settings` (`users.google_auto_sync`), final report verification (`targetStatus === 'final'`) triggers background synchronization automatically without blocking UI response times.

---

## 6. HIPAA Audit Trail
Every Google account connection, disconnection, and report synchronization event dispatches a tamper-evident audit record via `auditService.log()`.

---

## 7. Production OAuth Redirect URI & Domain Configuration
- **Dynamic Host Resolution**:
  - The OAuth URL endpoint (`/api/google/auth/url`) and callback endpoint (`/api/google/auth/callback`) dynamically derive `redirect_uri` from incoming request headers (`x-forwarded-host`, `x-forwarded-proto`), defaulting to the production workstation domain (`https://radiology.sehatai.org`).
- **Google Cloud Console Whitelist Requirement**:
  - The OAuth 2.0 Client ID must have the following URIs listed under **Authorized redirect URIs**:
    - `https://radiology.sehatai.org/api/google/auth/callback` (Production)
    - `http://localhost:3780/api/google/auth/callback` (Local Development)

---

## 8. Google Cloud Console OAuth Verification & Legal Disclosures
For the Google Cloud OAuth Consent Screen verification form:
- **Application Name**: Rad Suite (by SehatAI)
- **Application Home Page**: `https://radiology.sehatai.org`
- **Application Privacy Policy Link**: `https://radiology.sehatai.org/privacy`
- **Application Terms of Service Link**: `https://radiology.sehatai.org/terms`
- **Brand Assets & High-Resolution Logos**: `https://radiology.sehatai.org/brand`
- **Authorized Domain**: `sehatai.org`
- **Support & Developer Email**: `official@sehatai.org`
- **Google API Services User Data Policy Compliance**: Explicit Limited Use disclosure included on `/privacy` guaranteeing zero generalized AI model training, zero sale of user data, and zero advertising.

---

## 9. Per-User DICOM Case Storage Isolation & Ephemeral VPS Transit

To eliminate cloud storage and SSD disk costs for non-admin users, Rad Suite enforces personal Google Drive storage isolation:
- **Role-Based Storage Policy**:
  - **Admin**: Retains authority to use central VPS SSD storage and designated S3 cloud storage.
  - **Non-Admin Clinicians**: Must link personal Google Drive (15 GB free quota). DICOM studies claimed or requested by non-admins are archived exclusively to their personal Drive.
- **Hierarchical Case Vault Taxonomy**:
  ```
  Rad Suite Cases /
  └── {YYYY} /
      └── {MM} - {MonthName} /
          └── {MODALITY} /
              └── [MODALITY] {ACCESSION} - {PATIENT_NAME}.zip
  ```
- **Ephemeral Transit Buffer**:
  - Studies requested by non-admins are hot-staged temporarily on VPS SSD to allow 0–1ms web viewing and reporting in Cornerstone3D / OHIF.
  - In the background, `gdrive-study-upload.service.ts` uploads the consolidated Study ZIP to the clinician's Google Drive via the Resumable Upload protocol (`uploadType=resumable`).
  - Once uploaded, the study is tagged as ephemeral (`isEphemeralVps: true`) and pruned from VPS SSD, reclaiming local disk space with zero persistent host footprint.
- **On-Demand RadiAnt & Workstation Streaming**:
  - When a clinician downloads a study for RadiAnt or external viewers, `/api/cases/[accession]/download-dicom` dynamically streams the Study ZIP from the clinician's Google Drive using their secured OAuth token.



