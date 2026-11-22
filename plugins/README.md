# Rad Suite Open-Core Plugin Architecture

Rad Suite features an extensible **Open-Core Plugin Architecture** designed to allow hospitals, researchers, and developers to extend the workstation without modifying core code.

## Plugin Structure

Every plugin is a directory (or a `.zip` archive) containing at its root:
1. `manifest.json` — Metadata, requested permissions, backend port (if any), and UI slot contributions.
2. Optional web assets or backend microservices.

### Example `manifest.json`

```json
{
  "id": "sample-workstation-plugin",
  "name": "Sample Workstation Plugin",
  "version": "1.0.0",
  "description": "An open-source example plugin demonstrating UI slot integration in Rad Suite.",
  "author": "DocEducates Community",
  "enabled": true,
  "slots": [
    {
      "slotId": "workstation:toolbar",
      "id": "sample-btn",
      "title": "Sample Tool",
      "icon": "Sparkles",
      "actionUrl": "/api/plugins/sample-workstation-plugin/action"
    }
  ]
}
```

## Available UI Plugin Slots

Plugins can contribute into any of the following standardized UI slots:
- `workstation:toolbar`: Adds quick-action tools to the DICOM viewer toolbar.
- `workstation:sidebar`: Adds custom diagnostic utility panels to the right-hand companion drawer.
- `workstation:tab`: Adds dedicated clinical tabs to the viewer.
- `navigation:sidebar`: Adds navigational links to the main application navigation.
- `worklist:action`: Adds batch or individual case actions to the reporting worklist.
- `editor:ai-action`: Contributes AI or macro actions to the TipTap structured report editor.
- `settings:tab`: Embeds custom configuration panels into the Settings suite.
- `pacs:source`: Plugs custom DICOM DIMSE or REST data sources into the PACS aggregator.

## Installing Plugins

Plugins can be installed in two ways:
1. **Desktop / Web UI**: Navigate to **Settings -> Plugins** and click **Upload Plugin ZIP**.
2. **Directory Placement**: Extract the plugin folder into the `plugins/` directory on your server or workstation.

> [!NOTE]
> Proprietary hospital plugins (e.g. Punjab HMIS gateway, Clinic Edge harvester) are distributed separately in signed packages and maintain strict architectural separation from the open core.
