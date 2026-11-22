# Desktop Workstation, OTA Updates & LGH PACS Deployment

This document specifies the native Windows desktop application (Tauri v2), single-click NSIS packaging, Over-The-Air (OTA) cryptographic updater, default LGH PACS integration, startup experience, and alpha feature restrictions.

---

## 1. Desktop Architecture & Hardware Acceleration

Rad Suite wraps its Next.js and React presentation layer inside a native Windows desktop shell powered by **Tauri 2.0**:
- **Hardware Acceleration**: WebView2 executes with `--enable-gpu-rasterization --use-angle=d3d11 --enable-accelerated-2d-canvas`, delivering 60 FPS viewport rendering for volumetric CT and MRI studies.
- **Local SQLite Vault**: Data mutations write to local `radsuite.db` in milliseconds using SQLite WAL journal mode.
- **Single-Click NSIS Installer**: Configured in `src-tauri/tauri.conf.json` (`targets: ["nsis"]`, `perMachine: false`), allowing installation in user space (`AppData/Local/Programs/RadSuite`) without requiring hospital IT administrator UAC privileges.

---

## 2. Default LGH Hospital PACS (`10.0.0.100:8040`)

The primary PACS archive for Lahore General Hospital is pre-configured out of the box:
- **Server Parameters**: Host `10.0.0.100`, Port `8040`, AE Title `HMIS_PACS`, Calling AE `RADIANT`, Protocol `C-GET`.
- **Zero-Setup LAN Detection (`useLghPacsStatus`)**:
  - Whenever a doctor's laptop is connected to **LGH Wi-Fi or hospital Ethernet**, their computer is physically on the hospital network (`172.29.x.x`).
  - A silent, non-blocking TCP socket probe tests `10.0.0.100:8040` on launch and every 45 seconds.
  - **At LGH**: Resolves in < 20ms and displays `🟢 LGH PACS (10.0.0.100 • Connected)`. Doctors can query and retrieve today's CT and MRI cases immediately.
  - **Outside LGH**: Safely times out in 1.2s without freezing the UI, displaying `⚪ LGH PACS (Offsite)`. The workstation automatically switches to Google Drive or local DICOM files without throwing errors.

---

## 3. Startup Experience & Onboarding

1. **Diagnostic Splash Screen (`DiagnosticSplashScreen.tsx`)**:
   - Renders a dark obsidian boot canvas with glowing Rad Suite aperture mark on launch.
   - Live hardware telemetry animation: Direct3D 11 / WebGL2 GPU engine, local SQLite vault, and LGH PACS auto-detector.
   - Smoothly fades out after 1.5 seconds.
2. **First-Run Setup Wizard (`FirstRunSetupWizard.tsx`)**:
   - Automatically guides new users through a 5-step onboarding flow:
     1. *Welcome*: Radiology workstation capabilities overview.
     2. *Clinician Attribution*: Doctor's full name and designation (e.g., `Dr. Jane Doe (Resident Radiologist)`).
     3. *Punjab HMIS*: Official hospital ID and user credentials for worklist integration.
     4. *Google Drive PACS*: 1-click connection for 15 GB free personal cloud storage.
     5. *Shortcuts & Presets*: Mouse wheel scrubbing and HU window presets (`1`: Brain, `2`: Bone, `3`: Subdural, `4`: Soft Tissue).
   - Can be relaunched at any time from `/settings`.

---

## 4. Feature Gating & Alpha Restrictions

| Feature Area | Status in Alpha | User Experience |
| :--- | :--- | :--- |
| **DICOM Viewport** | Active | Fast WebGL2 rendering, presets, filmstrip thumbnails |
| **Report Drafting** | Active | Normal templates, rich text findings, local auto-save, PDF/Word export |
| **Punjab HMIS** | Active | Worklist fetch, draft save. **Final submit is strictly locked** (Rule 5). |
| **Google Drive PACS** | Active | Connect personal Google account; browse and stream cases directly |
| **Clinical AI Lab** | Under Construction | Displays `UnderConstructionModal` (*"Coming in Beta"*). Regex rules remain active. |
| **Central VPS Sync** | Under Testing | Displays informational notice. All data preserved in local vault. |

---

## 5. Over-The-Air (OTA) Updates

- **Cryptographic Minisign Verification**:
  - Uses `tauri-plugin-updater` with Minisign signatures.
  - The public key is embedded in `tauri.conf.json`.
- **Client In-App Flow (`useDesktopUpdater.ts` & `DesktopUpdateBanner.tsx`)**:
  - Checks update manifest (`latest.json`) on startup.
  - When an update is detected, a sleek floating banner informs the clinician: `🚀 Rad Suite Alpha v1.0.1 is available [Update & Restart]`.
  - Downloads patch in background with live progress and restarts seamlessly via `tauri-plugin-process`.

---

## 6. The 3-Stage Zero-Fear Deployment Strategy

1. **Ring 0 (Self-Testing)**:
   - Run `.\scripts\build-desktop-alpha.ps1` to produce the `.exe` installer.
   - Install on your laptop. Connect to LGH Wi-Fi, verify PACS `10.0.0.100:8040`, draft a case, and export PDF.
2. **Ring 1 (Friendly Pilot)**:
   - Share the installer with ONE trusted co-resident or friend at LGH.
   - Observe their first run and gather initial feedback.
3. **Ring 2 (Department Alpha)**:
   - Once Ring 1 is validated, provide the installer to the wider department.
   - Push bug fixes and improvements seamlessly via the OTA updater without manual reinstalls.

---

## 7. Desktop Standalone Runtime & Google OAuth Handshake

1. **Instant-Launch Threading Architecture**:
   - `tauri::Builder.setup()` runs non-blocking, immediately rendering the splash viewport (`out/index.html`) in < 200ms.
   - Backend discovery (`find_available_port`) and `server.js` child process spawning run on an isolated worker thread.
   - Port probing utilizes non-blocking `TcpStream::connect_timeout` (50ms), preventing socket exhaustion and UI freezing.
2. **Standardized Brand Identity**:
   - All desktop bundle targets (`icon.ico`, `icon.png`, `128x128.png`, `32x32.png`, NSIS installer) are generated directly from the canonical SVG emblem (`public/brand/radsuite-icon.svg`).
3. **Google OAuth 2.0 Loopback Normalization**:
   - Google Cloud Console authorization requires `http://localhost:3780/api/google/auth/callback`.
   - `getGoogleOAuthCredentials()` automatically normalizes loopback addresses (`127.0.0.1`, `[::1]`, `0.0.0.0`) to `localhost` to eliminate `redirect_uri_mismatch (Error 400)`.
   - System browser handoff opens via `rundll32 url.dll,FileProtocolHandler`, avoiding Windows `cmd.exe` query string separator bugs.
   - Loopback session cookies enforce `secure: false` in desktop mode (`IS_DESKTOP === '1'`) to ensure cookies persist properly over HTTP in WebView2.
