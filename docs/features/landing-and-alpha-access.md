# Landing Page, Alpha Waitlist, RBAC & Invite Gating

## Overview
Rad Suite features a high-performance public landing page (`/`), an invite-gated alpha access architecture, granular screen-level Role-Based Access Control (RBAC), and user management with automated aaPanel email and 1-click WhatsApp notifications.

---

## 1. Public Landing Page (`/`)
- **Zero Sensitive PACS Leaks**: The landing page deliberately focuses on clinician benefits while concealing internal hospital LAN topology, C-GET scripts, reverse tunnels, and sandbox storage.
- **Featured Capabilities**:
  1. **Intelligent HMIS Automation**: Smart investigation matching, automated worklist generation, 1-click draft injection, anti-collision locks.
  2. **High-Performance DICOM Engine**: WebGL/WebGPU 60 FPS viewport scrubbing, instant Hounsfield Unit (HU) window presets (Brain, Bone, Subdural, Soft Tissue), multi-planar reconstruction.
  3. **Multi-Platform Ecosystem**: Highlighting the **Native Desktop App with dedicated GPU acceleration** (Tauri/Rust) and the **Upcoming Mobile Diagnostics Companion** (iOS & Android).
  4. **Diagnostic Voice Lab**: Clinical AI dictation tuned for complex radiology phrasing, one-click impression synthesis, and critical finding alert safeguards.
  5. **Interactive Workstation Preview**: A live simulated CT Brain axial canvas with interactive HU presets and real-time AI impression drafting.

---

## 2. Pre-Registration & Alpha Gating Workflow
```
[Visitor at Landing Page] ──► [Pre-Registration Form (/pre-register)]
                                     │
                                     ▼
                          [Pre-Registrations Table]
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
     [Auto-Acknowledgment Email]             [Admin Cockpit (/users)]
     (from official@sehatai.org)                     │
                                                     ▼
                                            [1-Click Approve]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼                                               ▼
               [Dispatch Invite Email]                             [1-Click WhatsApp Link]
             (with /register?invite=CODE)                       (pre-filled wa.me message)
```

1. **Unregistered Clinicians**: Can apply for the private alpha via the embedded landing form or `/pre-register`.
2. **Account Creation Without Invite Code**: If a user registers without an invite code, their account is provisioned with `status: 'waitlisted'`.
3. **Standby Portal (`/pending-access`)**: Waitlisted or pending users cannot access dashboard features (`/worklist`, `/my-cases`, etc.). They are greeted by an accessible standby screen where they can input their invite code at any time to instantly unlock the workstation.
4. **Account Creation With Invite Code**: Validating an invite code sets `status: 'active'`, assigns the role and permitted screens associated with the invite, and immediately unlocks the dashboard.

---

## 3. Granular Screen-Level RBAC & PACS Control
- **User Management Cockpit (`/users`)**: Restricted strictly to the `admin` role. Contains 3 tabs:
  1. **Clinicians & RBAC**: Table of users with status badges and an "Edit Access" modal allowing admins to toggle exactly which screens a doctor can view.
  2. **Alpha Waitlist**: Leads from the landing page with 1-click "Approve & Invite" dispatch.
  3. **Invite Codes Ledger**: Generate single or batch invite codes with expiration dates, custom screen presets, and copyable direct registration links.
- **PACS Direct Access Isolation**: Direct hospital PACS search and slice harvesting (`/pacs`) is disabled by default for non-admins unless explicitly enabled in their user's `allowedScreens` array. Unauthorized visits render a disabled access notice.
- **Strict Settings Tab Isolation**: Non-admin clinicians only see **Clinician Profile** and **Punjab HMIS Portal** tabs. All other tabs (`ai`, `google`, `display`, `pacs`, `clinic-node`, `storage`) are hidden from the UI and blocked even with direct URL parameters.
- **Report Editing Ownership**: The HMIS patient worklist is common and visible to all clinicians for collaborative triage, but editing or finalizing reports claimed by another radiologist is strictly blocked for non-admins (`Case lock: You cannot edit a report claimed by another radiologist`).

---

## 4. Notification Integration (aaPanel SMTP & WhatsApp)
- **aaPanel SMTP**:
  - Configured in `@/lib/config` (`vps.doceducates.com`, port 465 SSL, user `official@sehatai.org`).
  - Sends high-craft HTML transactional emails for pre-registration acknowledgments and alpha invite codes.
- **1-Click WhatsApp Dispatch**:
  - Automatically formats `https://wa.me/<phone>?text=...` links for Pakistani (e.g. `0300...` -> `92300...`) and international numbers with pre-filled greetings, codes, and login URLs.
