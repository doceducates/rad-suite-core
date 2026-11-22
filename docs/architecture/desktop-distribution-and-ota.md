# Desktop Distribution, OTA Updates & Automated Release Pipeline

This document specifies the distribution architecture, automated release pipeline, and Over-The-Air (OTA) update mechanics for the native **Rad Suite Diagnostic Workstation** desktop app (Windows 10/11 x64).

---

## 1. Automated Release Pipeline (`scripts/release-desktop.ps1`)

The release pipeline produces production-ready, single-click Windows installers (`Rad Suite_<version>_x64-setup.exe`) bundling an embedded Node.js runtime and local SQLite database:

```bash
# Standard automated release
.\scripts\release-desktop.ps1 -Version 1.0.1 -ReleaseNotes "PACS query performance speedups"

# Release with automatic S3 cloud upload
.\scripts\release-desktop.ps1 -Version 1.0.1 -ReleaseNotes "PACS speedups" -UploadS3
```

### Pipeline Execution Stages:
1. **Toolchain Verification**: Checks Rust/Cargo and Node.js versions.
2. **Database Backup Safeguard (Rule 6)**: Automatically backs up `radsuite.db` to `db_backups/radsuite_prebuild_<timestamp>.db`.
3. **Version Synchronization**: Updates version in `package.json` and `src-tauri/tauri.conf.json`.
4. **Standalone Server Packaging**:
   - Compiles Next.js standalone distribution (`npm run build`).
   - Syncs static assets (`.next/static`) and `public/` into `.next/standalone`.
   - Embeds portable `node.exe` into standalone folder for zero-dependency portability.
   - Stages standalone payload into `src-tauri/resources/standalone`.
5. **Tauri NSIS Compilation**: Compiles the native installer using `npx @tauri-apps/cli build`.
6. **Integrity Hashing & Sizing**: Computes exact byte size and SHA-256 cryptographic checksum.
7. **Manifest Generation & Staging**: Generates `public/releases/latest.json` and copies the installer to `public/releases/`.
8. **Cloud Distribution (Optional)**: Executes `scripts/upload-release-s3.js` to push installer and updater manifest to S3 storage (`https://s3.sehatai.org/rad-suite/releases/`).

---

## 2. Distribution API Gateway & Endpoints

| Endpoint | Method | Format | Purpose |
| :--- | :---: | :---: | :--- |
| **`/api/download/desktop`** | `GET` | Stream / Binary | Direct single-click download for `.exe` installer with `Content-Disposition` |
| **`/api/releases/latest`** | `GET` | JSON | Structured release metadata (version, notes, size, SHA-256) for website UI |
| **`/api/releases/latest.json`** | `GET` | JSON | Tauri v2 auto-updater specification format |
| **`/download`** | `GET` | HTML / React | Dedicated clinician download hub with visual installation guide & checksum |

---

## 3. In-App Desktop Update Detection (`useDesktopUpdater`)

The desktop app checks for updates 3.5 seconds after launch and periodically every 4 hours:
- **Tauri Native Updater**: Invokes `@tauri-apps/plugin-updater` against `/api/releases/latest.json`.
- **HTTP Fallback**: If running in browser or hybrid webview, checks `/api/releases/latest` via standard HTTP fetch.
- **Non-Intrusive Notification**: When a new version is detected, a floating update banner appears (`DesktopUpdateBanner`), displaying release notes and a 1-click "Update Now" action without interrupting clinical reporting.
- **Silent Restart**: Upon download completion, the updater restarts the application seamlessly via `@tauri-apps/plugin-process`.
