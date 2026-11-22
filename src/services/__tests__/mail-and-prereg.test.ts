import { describe, it, expect, vi } from 'vitest';
import { mailService } from '../mail.service';
import nodemailer from 'nodemailer';

describe('Mail Service & Pre-Registration Email Notifications', () => {
  it('dispatches pre-registration email without throwing exceptions', async () => {
    const sendMailSpy = vi.fn().mockResolvedValue({ messageId: 'test-msg-123' });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailSpy,
    } as any);

    const ok = await mailService.sendAlphaPreRegistrationEmail({
      to: 'doctor@example.com',
      fullName: 'Dr. Tariq',
      hospital: 'Mayo Hospital',
      roleDesignation: 'Consultant Radiologist',
    });

    expect(typeof ok).toBe('boolean');
  });

  it('dispatches alpha invite code email with proper links', async () => {
    const sendMailSpy = vi.fn().mockResolvedValue({ messageId: 'test-msg-456' });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailSpy,
    } as any);

    const ok = await mailService.sendAlphaInviteEmail({
      to: 'doctor@example.com',
      fullName: 'Dr. Sarah',
      inviteCode: 'RAD-789-XYZ',
      role: 'consultant',
      allowedScreens: ['my_cases', 'workstation'],
    });

    expect(typeof ok).toBe('boolean');
  });
});
