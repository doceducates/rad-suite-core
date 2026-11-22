# Modular Plugin & Open Core Architecture

## 1. Overview
Rad Suite employs an **Open Core + Modular Plugin Architecture** to ensure clean separation between the open-source diagnostic workstation and proprietary enterprise/hospital integrations.

```
+-------------------------------------------------------------------+
|                   Rad Suite Open Core Base                        |
|                                                                   |
|   +---------------------+   +---------------------------------+   |
|   | Cornerstone / WebGL |   | TipTap Structured Report Editor |   |
|   +---------------------+   +---------------------------------+   |
|   +---------------------+   +---------------------------------+   |
|   | Offline SQLite DB   |   | DICOM DIMSE Client (C-GET/FIND) |   |
|   +---------------------+   +---------------------------------+   |
+-------------------------------------------------------------------+
                                  ^
                                  | Extension Slots & Proxy
+-------------------------------------------------------------------+
|               Proprietary Modular Plugins (.zip)                 |
|                                                                   |
|   [ plugin-hmis-gateway ]      [ plugin-clinic-edge ]             |
|   Punjab HMIS Automation       Silent Session 0 PACS Harvester    |
|                                                                   |
|   [ plugin-hospital-ai ]       [ plugin-cloud-mirror ]            |
|   Specialized Model Weights    S3/Ceph Multi-Tenant Sync          |
+-------------------------------------------------------------------+
```

---

## 2. Open Core Boundaries

### What Belongs in Core
- **DICOM Viewing & Imaging**: WebGL/Cornerstone canvas rendering, MPR cross-sectional reslicing, 3D point locator, cine playback, window/level presets.
- **Diagnostic Structured Reporting**: TipTap rich-text editor, standard radiology templates, ICD-10 suggestions, markdown/DOCX/PDF export.
- **Local Data & Offline Persistence**: Standalone SQLite database, schema migrations, local file imports, and audit log tracking.
- **Native Desktop App**: Tauri cross-platform wrapper (Windows NSIS, macOS DMG, Linux AppImage).
- **Public Extension Engine**: `<PluginSlot />` UI primitives, Plugin Manager service, and secure API route proxies.

### What Belongs in Modular Plugins
- **Government & Regional Portals**: Punjab HMIS Puppeteer automation (`plugin-hmis-gateway`).
- **Hospital Infrastructure & Telemetry**: Silent Windows Session 0 edge nodes and reverse command dispatchers (`plugin-clinic-edge`).
- **Proprietary AI Fine-tunes**: Custom on-premise model weights, hospital-specific dictation vocabulary.
- **Enterprise Multi-Tenant Cloud Mirrors**: S3 Ceph synchronization pipelines and proprietary cloud aggregators.

---

## 3. Extension Slots

Core exposes standardized UI extension slots. Plugins declare contributions in their `manifest.json`:

| Slot ID | Location | Primary Purpose |
| :--- | :--- | :--- |
| `workstation:toolbar` | Top navigation bar | Session badges, external sync triggers, quick action buttons |
| `workstation:sidebar` | Workstation left navigation | Modular workflow views, portal queues, custom worklists |
| `workstation:tab` | Reporting / viewer tab list | Custom specialized reporting views, discussion sidecars |
| `worklist:action` | Worklist action menus | 1-click export to external portals, custom batch dispatches |
| `editor:ai-action` | TipTap reporting editor | Custom LLM prompts, regional vocabulary expansions |
| `settings:tab` | Settings container | Dedicated configuration tabs for the plugin |
| `pacs:source` | PACS aggregator | Custom storage adapters and remote PACS endpoints |

---

## 4. Plugin Packaging & Distribution

1. **Manifest File (`manifest.json`)**:
   Every plugin must provide a valid `manifest.json` adhering to `PluginManifestSchema`:
   ```json
   {
     "id": "hmis-gateway",
     "name": "Punjab HMIS Gateway & Livewire Sync",
     "version": "1.0.0",
     "description": "Bi-directional automation bridge for Punjab HMIS worklists.",
     "backendPort": 3788,
     "permissions": ["network", "hmis"],
     "slots": [
       {
         "slotId": "workstation:toolbar",
         "id": "hmis-session-status",
         "title": "HMIS Bridge",
         "actionUrl": "/settings?tab=hmis"
       }
     ],
     "enabled": true
   }
   ```

2. **Zip Distribution**:
   Plugins are compiled into standalone `.zip` archives (e.g. `private-plugins/plugin-hmis-gateway.zip`).
   - Admins install plugins via **Settings -> Plugins & Modules** with 1-click upload or unzip directly into the `plugins/` directory.
   - The plugin manager validates manifest structure and enforces strict **Zip Slip protection** to prevent directory traversal.

3. **Dynamic API Routing**:
   If a plugin defines `backendPort`, requests made to `/api/plugins/<pluginId>/...` are dynamically proxied to `http://127.0.0.1:<backendPort>/...` with authenticated headers (`X-RadSuite-User-Id`, `X-RadSuite-User-Role`).

---

## 5. Security & Zero-Leak Invariant
- **Zero Credentials in Core**: Never hardcode hospital internal IPs (`10.0.0.100`), passwords, API keys, or doctor personal data in core files.
- **Plugin Sandbox Isolation**: Core wraps third-party UI slots in `<PluginErrorBoundary>` to prevent any plugin crash from interrupting diagnostic reporting.
