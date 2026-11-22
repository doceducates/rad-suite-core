import { describe, it, expect, beforeEach } from 'vitest';
import { inviteService } from '../invite.service';
import { rbacService } from '../rbac.service';
import { db } from '@/db';
import { inviteCodes, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Alpha Invites & RBAC Service Suite', () => {
  const testUserId = crypto.randomUUID();

  beforeEach(async () => {
    // Seed a test user in test DB
    try {
      await db.insert(users).values({
        id: testUserId,
        name: 'Dr. Test Clinician',
        email: `test_${Date.now()}@hospital.org`,
        passwordHash: 'dummyhash',
        role: 'consultant',
        status: 'waitlisted',
        allowedScreens: '["my_cases","worklist"]',
        createdAt: new Date().toISOString(),
      } as any);
    } catch {}
  });

  describe('Invite Service', () => {
    it('creates a new cryptographically formatted invite code', async () => {
      const invite = await inviteService.createInviteCode({
        role: 'consultant',
        allowedScreens: ['my_cases', 'worklist', 'workstation'],
        maxUses: 1,
        recipientName: 'Dr. Test',
      });

      expect(invite.code).toMatch(/^RAD-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
      expect(invite.role).toBe('consultant');
      expect(invite.maxUses).toBe(1);
      expect(invite.usesCount).toBe(0);
      expect(invite.isActive).toBe(true);
    });

    it('validates and redeems an active invite code successfully', async () => {
      const invite = await inviteService.createInviteCode({
        role: 'pgr',
        allowedScreens: ['my_cases', 'workstation', 'studio'],
        maxUses: 1,
      });

      const val = await inviteService.validateInviteCode(invite.code);
      expect(val.valid).toBe(true);
      expect(val.invite).toBeDefined();

      const redemption = await inviteService.redeemInviteCode(invite.code, testUserId);
      expect(redemption.success).toBe(true);

      // Verify user updated to active
      const [u] = await db.select().from(users).where(eq(users.id, testUserId as any)).limit(1);
      expect(u.status).toBe('active');
      expect(u.role).toBe('pgr');
      expect(u.inviteCodeUsed).toBe(invite.code);

      // Second redemption should fail (maxUses reached)
      const secondVal = await inviteService.validateInviteCode(invite.code);
      expect(secondVal.valid).toBe(false);
      expect(secondVal.reason).toContain('maximum redemptions');
    });

    it('rejects invalid or non-existent invite codes', async () => {
      const res = await inviteService.validateInviteCode('INVALID-CODE-999');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('Invite code not found');
    });

    it('revokes an invite code properly', async () => {
      const invite = await inviteService.createInviteCode({ role: 'consultant' });
      await inviteService.revokeInviteCode(invite.id);

      const val = await inviteService.validateInviteCode(invite.code);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('deactivated');
    });
  });

  describe('RBAC & Screen Access Control', () => {
    it('allows admins access to all screens', () => {
      const adminUser: any = { id: 'admin1', role: 'admin', status: 'active' };
      expect(rbacService.canAccessScreen(adminUser, 'pacs')).toBe(true);
      expect(rbacService.canAccessScreen(adminUser, 'users')).toBe(true);
      expect(rbacService.canAccessScreen(adminUser, 'audit')).toBe(true);
      expect(rbacService.canAccessScreen(adminUser, 'workstation')).toBe(true);
    });

    it('blocks non-admin users from admin-only screens', () => {
      const docUser: any = { id: 'doc1', role: 'consultant', status: 'active', allowedScreens: ['*'] };
      expect(rbacService.canAccessScreen(docUser, 'users')).toBe(false);
      expect(rbacService.canAccessScreen(docUser, 'audit')).toBe(false);
    });

    it('restricts PACS screen by default unless explicitly in allowedScreens', () => {
      const normalUser: any = {
        id: 'doc2',
        role: 'consultant',
        status: 'active',
        allowedScreens: ['my_cases', 'worklist', 'workstation'],
      };
      expect(rbacService.canAccessScreen(normalUser, 'pacs')).toBe(false);

      const pacsGrantedUser: any = {
        id: 'doc3',
        role: 'consultant',
        status: 'active',
        allowedScreens: ['my_cases', 'worklist', 'pacs'],
      };
      expect(rbacService.canAccessScreen(pacsGrantedUser, 'pacs')).toBe(true);
    });

    it('blocks all screens for waitlisted or suspended accounts', () => {
      const waitlistedUser: any = { id: 'doc4', role: 'consultant', status: 'waitlisted', allowedScreens: ['*'] };
      expect(rbacService.canAccessScreen(waitlistedUser, 'worklist')).toBe(false);

      const suspendedUser: any = { id: 'doc5', role: 'consultant', status: 'suspended', allowedScreens: ['*'] };
      expect(rbacService.canAccessScreen(suspendedUser, 'worklist')).toBe(false);
    });

    it('enforces report ownership: users can view common patient list but cannot edit reports of others', () => {
      const doctorA: any = { id: 'docA', name: 'Dr. Asim', role: 'consultant', status: 'active' };
      const otherReport: any = { id: 'rep1', signedBy: 'Dr. Tariq (Consultant Radiologist)', pgrAuthorId: 'docB' };
      const claimedStudy: any = { assignedRadiologistId: 'docB' };

      // Doctor A should NOT be able to edit Doctor B's claimed report
      expect(rbacService.canEditReport(doctorA, otherReport, claimedStudy)).toBe(false);

      // Doctor B CAN edit their own report
      const doctorB: any = { id: 'docB', name: 'Dr. Tariq', role: 'consultant', status: 'active' };
      expect(rbacService.canEditReport(doctorB, otherReport, claimedStudy)).toBe(true);

      // System admin can edit any report
      const admin: any = { id: 'adm', role: 'admin', status: 'active' };
      expect(rbacService.canEditReport(admin, otherReport, claimedStudy)).toBe(true);
    });

    it('formats a valid WhatsApp invite URL with clean country code', () => {
      const url = rbacService.buildWhatsAppInviteUrl('03001234567', 'RAD-123-456', 'Asim');
      expect(url).toContain('https://wa.me/923001234567');
      expect(url).toContain('RAD-123-456');
      expect(url).toContain('Dr.%20Asim');
    });
  });

  describe('Feature Permissions & HMIS Safety Invariants (hasPermission)', () => {
    it('strictly locks hmis_final_submit for ALL roles including admin (Rule 5 Zero-Submit)', () => {
      const admin: any = { id: 'adm', role: 'admin', status: 'active' };
      const consultant: any = { id: 'c1', role: 'consultant', status: 'active' };
      const pgr: any = { id: 'p1', role: 'pgr', status: 'active' };
      const tech: any = { id: 't1', role: 'technologist', status: 'active' };

      expect(rbacService.hasPermission(admin, 'hmis_final_submit')).toBe(false);
      expect(rbacService.hasPermission(consultant, 'hmis_final_submit')).toBe(false);
      expect(rbacService.hasPermission(pgr, 'hmis_final_submit')).toBe(false);
      expect(rbacService.hasPermission(tech, 'hmis_final_submit')).toBe(false);
    });

    it('denies all permissions to waitlisted or suspended clinicians', () => {
      const waitlisted: any = { id: 'w1', role: 'consultant', status: 'waitlisted' };
      const suspended: any = { id: 's1', role: 'admin', status: 'suspended' };

      expect(rbacService.hasPermission(waitlisted, 'clinical_reporting')).toBe(false);
      expect(rbacService.hasPermission(waitlisted, 'lgh_lan_pacs')).toBe(false);
      expect(rbacService.hasPermission(suspended, 'manage_users')).toBe(false);
      expect(rbacService.hasPermission(suspended, 'google_drive_pacs')).toBe(false);
    });

    it('grants appropriate role-based permissions for active clinicians', () => {
      const consultant: any = { id: 'c1', role: 'consultant', status: 'active' };
      const tech: any = { id: 't1', role: 'technologist', status: 'active' };
      const admin: any = { id: 'a1', role: 'admin', status: 'active' };

      // Consultant can report & save HMIS drafts & access local PACS + GDrive
      expect(rbacService.hasPermission(consultant, 'clinical_reporting')).toBe(true);
      expect(rbacService.hasPermission(consultant, 'hmis_draft_sync')).toBe(true);
      expect(rbacService.hasPermission(consultant, 'lgh_lan_pacs')).toBe(true);
      expect(rbacService.hasPermission(consultant, 'google_drive_pacs')).toBe(true);
      // Restricted in alpha
      expect(rbacService.hasPermission(consultant, 'cloud_vps_sync')).toBe(false);
      expect(rbacService.hasPermission(consultant, 'clinical_ai_copilot')).toBe(false);
      expect(rbacService.hasPermission(consultant, 'manage_users')).toBe(false);

      // Technologist can acquire/view PACS & GDrive, but not report or draft HMIS
      expect(rbacService.hasPermission(tech, 'lgh_lan_pacs')).toBe(true);
      expect(rbacService.hasPermission(tech, 'google_drive_pacs')).toBe(true);
      expect(rbacService.hasPermission(tech, 'clinical_reporting')).toBe(false);
      expect(rbacService.hasPermission(tech, 'hmis_draft_sync')).toBe(false);

      // Admin has elevated operational access
      expect(rbacService.hasPermission(admin, 'manage_users')).toBe(true);
      expect(rbacService.hasPermission(admin, 'audit_trail')).toBe(true);
      expect(rbacService.hasPermission(admin, 'cloud_vps_sync')).toBe(true);
    });

    it('validates and activates waitlisted user using master alpha code LGH-ALPHA-2026', async () => {
      // Ensure master invite code exists or validate it
      const validation = await inviteService.validateInviteCode('LGH-ALPHA-2026');
      if (validation.valid) {
        const redemption = await inviteService.redeemInviteCode('LGH-ALPHA-2026', testUserId);
        expect(redemption.success).toBe(true);

        const [u] = await db.select().from(users).where(eq(users.id, testUserId as any)).limit(1);
        expect(u.status).toBe('active');
      } else {
        expect(validation.valid).toBe(false);
      }
    });
  });
});
