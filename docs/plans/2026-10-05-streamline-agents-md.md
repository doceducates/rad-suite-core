# Streamline AGENTS.md & Modularize Documentation Plan

> **Created:** 2026-10-05  
> **Status:** Executed  
> **Objective:** Reduce `AGENTS.md` from 51KB to <6KB, establish the Mandatory Documentation Policy, and organize the 28 architectural specs into modular domain documentation under `docs/`.

---

## 1. Context & Motivation
`AGENTS.md` had grown to 51,203 bytes across 28 numbered sections. Loaded as a system prompt rule on every agent conversation turn, it was consuming >12,000 tokens, suffering from truncation, and bloating context.

## 2. Refactoring Strategy
1. **Root `AGENTS.md`**:
   - Retain foundational non-negotiable invariants (Modularity & <250/350 line limits, 4-Layer Architecture, Security & HIPAA, Multi-Platform isolation, HMIS zero-submit/reject safety).
   - Add **Mandatory Documentation Policy**: Explicitly forbid appending feature specs to `AGENTS.md`. Mandate creating/updating modular docs in `docs/`.
   - Add **Documentation Index & Subsystem Search Map**: Clear navigation directory pointing to where specific feature specifications live.
2. **Modular Documentation Directory (`docs/`)**:
   - `docs/INDEX.md`: Master table of contents and documentation navigation.
   - `docs/architecture/overview.md`: 4-layer architecture, file size limits, HIPAA, hardware isolation, theming.
   - `docs/architecture/storage-and-cloud.md`: S3 Ceph, path-style, taxonomy, LRU cache, RadiAnt ZIP streaming.
   - `docs/architecture/pacs-and-sources.md`: Hospital PACS DIMSE C-GET, 15-min scheduled harvester, 5-tier federated storage.
   - `docs/architecture/clinic-pc-nodes.md`: Clinic PC edge daemons, reverse tunnel, Windows Session 0, SigV4, OTA.
   - `docs/architecture/auth-and-security.md`: Dual-identifier login, case-sensitive usernames, AES-256-GCM, RBAC settings.
   - `docs/integrations/hmis-portal.md`: Punjab HMIS portal integration, safety locks, Livewire sync, harvesting, track API.
   - `docs/integrations/google-docs-drive.md`: Google Drive/Docs clinical export, OAuth, auto-sync.
   - `docs/features/workstation-and-reporting.md`: Standby explorer, split/PiP reporting modes, mobile suite & FAB.
   - `docs/features/worklist-and-allocation.md`: Resident claim locks, discrepancy matrix, WhatsApp handover, multi-sort.
   - `docs/features/local-ai-and-dictation.md`: Llama-server runner, port 8090, dictation parser, regional prompts.
   - `docs/features/patient-and-case-management.md`: Mandatory MRN/accession rule, manual entry modal, clinical clipboard.
