import type { User, UserRole } from '@/types';
import { config } from '@/lib/config';

export interface ScreenDefinition {
  id: string;
  name: string;
  description: string;
  href: string;
  category: 'clinical' | 'imaging' | 'system';
  isRestrictedByDefault?: boolean;
}

export type FeaturePermission =
  | 'clinical_reporting'
  | 'hmis_draft_sync'
  | 'hmis_final_submit'
  | 'lgh_lan_pacs'
  | 'google_drive_pacs'
  | 'cloud_vps_sync'
  | 'clinical_ai_copilot'
  | 'manage_users'
  | 'audit_trail';

export const ALL_SCREENS: ScreenDefinition[] = [
  { id: 'dashboard', name: 'Command Center', description: 'Central clinical dashboard and shift telemetry', href: '/dashboard', category: 'clinical' },
  { id: 'my_cases', name: 'My Cases', description: 'Assigned active reporting cases', href: '/my-cases', category: 'clinical' },
  { id: 'hmis', name: 'HMIS', description: 'Central patient queue and clinical reporting worklist', href: '/hmis', category: 'clinical' },
  { id: 'pacs', name: 'PACS Studies', description: 'Direct DICOM query and retrieval (Restricted)', href: '/pacs', category: 'clinical', isRestrictedByDefault: true },
  { id: 'workspace', name: 'Workspace', description: 'Multi-slice DICOM viewer & reporting editor', href: '/workspace', category: 'clinical' },
  { id: 'atlas', name: 'Anatomy Atlas', description: 'Interactive multi-planar cross-sectional anatomy atlas', href: '/atlas', category: 'imaging', isRestrictedByDefault: true },
  { id: 'studio', name: 'Voice Lab Studio', description: 'AI clinical dictation & audio macros', href: '/studio', category: 'imaging' },
  { id: 'intake', name: 'Intake & OCR', description: 'Requisition scanning and history extraction', href: '/intake', category: 'imaging' },
  { id: 'archive', name: 'Archive & Logbook', description: 'Finalized reports and clinical logbook', href: '/hmis?tab=archive', category: 'imaging' },
  { id: 'audit', name: 'Security Audit Trail', description: 'Immutable HIPAA compliance logs', href: '/audit', category: 'system', isRestrictedByDefault: true },
  { id: 'settings', name: 'Settings', description: 'User profile and system settings', href: '/settings', category: 'system' },
  { id: 'users', name: 'User Management & RBAC', description: 'Alpha access, invite codes and clinician roles', href: '/users', category: 'system', isRestrictedByDefault: true },
];

export const rbacService = {
  /**
   * Checks whether a user can access a specific screen
   */
  canAccessScreen(user: (User & { allowedScreens?: string[]; status?: string }) | null | undefined, screenId: string): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.status && user.status !== 'active') return false;

    // Users and Audit are strictly admin-only
    if (screenId === 'users' || screenId === 'audit') {
      return false;
    }

    // Educational student role is strictly limited to atlas, dashboard, and settings
    if (user.role === 'student') {
      return ['dashboard', 'atlas', 'settings'].includes(screenId);
    }

    // Atlas screen is universally available to all active accounts in Atlas mode
    if (screenId === 'atlas' && config.isAtlasMode) {
      return true;
    }

    const allowed = this.parseAllowedScreens(user.allowedScreens);
    if (allowed.includes('*')) {
      // Even if wildcard, PACS is strictly restricted unless explicitly named
      if (screenId === 'pacs') {
        return allowed.includes(screenId);
      }
      return true;
    }

    if (screenId === 'workspace' || screenId === 'workstation') {
      return allowed.includes('workspace') || allowed.includes('workstation');
    }

    if (screenId === 'hmis' || screenId === 'worklist') {
      return allowed.includes('hmis') || allowed.includes('worklist');
    }

    return allowed.includes(screenId);
  },

  /**
   * Evaluates granular storage source permissions (Local, GDrive, S3, Hospital PACS, Remote Node)
   */
  canAccessStorageSource(
    user: (User & { allowedStorageSources?: string[]; status?: string }) | null | undefined,
    source: 'local' | 'local_archive' | 'gdrive' | 's3' | 'pacs' | 'hospital_pacs' | 'remote_node' | string
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.status && user.status !== 'active') return false;

    // Normalize source synonyms
    const norm = source === 'local_archive' ? 'local' : source === 'hospital_pacs' ? 'pacs' : (source === 'clinic_pacs' || source === 'clinic_node') ? 'remote_node' : source;
    // Local cases and personal Google Drive are always permitted for active clinical users
    if (norm === 'local' || norm === 'gdrive') return true;

    // S3 Cloud, Hospital PACS DIMSE, and Remote Clinic Node require explicit admin grant
    let allowed: string[] = [];
    try {
      if (Array.isArray(user.allowedStorageSources)) {
        allowed = user.allowedStorageSources;
      } else if (typeof user.allowedStorageSources === 'string') {
        allowed = JSON.parse(user.allowedStorageSources);
      }
    } catch {}

    if (allowed.includes('*')) return true;
    return allowed.includes(norm);
  },

  /**
   * Evaluates granular capability permissions across clinical, PACS, and admin domains
   */
  hasPermission(
    user: (User & { allowedScreens?: string[]; status?: string }) | null | undefined,
    permission: FeaturePermission
  ): boolean {
    if (!user) return false;
    if (user.status && user.status !== 'active') return false;

    // Punjab HMIS Invariant: Final submission is hard-locked for ALL users including admins
    if (permission === 'hmis_final_submit') return false;

    if (user.role === 'admin') return true;

    switch (permission) {
      case 'clinical_reporting':
      case 'hmis_draft_sync':
        return ['consultant', 'radiologist', 'pgr', 'resident'].includes(user.role);

      case 'lgh_lan_pacs':
      case 'google_drive_pacs':
        return ['consultant', 'radiologist', 'pgr', 'resident', 'technologist'].includes(user.role);

      case 'clinical_ai_copilot':
      case 'cloud_vps_sync':
      case 'manage_users':
      case 'audit_trail':
        return (user.role as string) === 'admin';

      default:
        return false;
    }
  },

  /**
   * Checks whether a clinician can edit a given report
   * Invariant: Clinicians can view all common patients, but cannot edit reports of others
   */
  canEditReport(
    user: (User & { role?: string }) | null | undefined,
    report: { signedBy?: string | null; pgrAuthorId?: string | null; id?: string },
    study?: { assignedRadiologistId?: string | null; hmisStatus?: string | null }
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // If report is already final or submitted, editing is locked
    // If study is claimed by this radiologist
    if (study?.assignedRadiologistId && study.assignedRadiologistId === user.id) {
      return true;
    }

    // If authored by this user
    if (report.pgrAuthorId && report.pgrAuthorId === user.id) {
      return true;
    }
    if (report.signedBy && (report.signedBy === user.name || report.signedBy === (user as any).hmisReportingDoctorName)) {
      return true;
    }

    // If study has no assigned radiologist yet, any active doctor can claim & start
    if (!study?.assignedRadiologistId && !report.signedBy && !report.pgrAuthorId) {
      return true;
    }

    return false;
  },

  /**
   * Parse allowed screens array from either array or JSON string
   */
  parseAllowedScreens(input: any): string[] {
    if (!input) return ['my_cases', 'hmis', 'workstation', 'studio', 'settings'];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  },

  /**
   * Formats a direct click-to-chat WhatsApp link with prefilled invite details
   */
  buildWhatsAppInviteUrl(phone: string, inviteCode: string, recipientName?: string): string {
    // Strip non-digits except leading plus
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    // If starts with 03 (Pakistani local format), replace with 923
    if (cleanPhone.startsWith('03')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }

    const nameGreeting = recipientName ? `Dr. ${recipientName}` : 'Doctor';
    const regUrl = `${config.appUrl}/register?invite=${inviteCode}`;
    const loginUrl = `${config.appUrl}/login`;

    const message = `Assalam-o-Alaikum ${nameGreeting},\n\nYour *Rad Suite Private Alpha* invitation is ready!\n\n🔑 *Invite Code:* \`${inviteCode}\`\n\nDirect Registration Link:\n${regUrl}\n\nLogin:\n${loginUrl}\n\nRad Suite Workstation — SehatAI`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },
};
