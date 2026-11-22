import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '@/lib/config';
import { logAudit } from './audit.service';

/**
 * Mail Service for Rad Suite
 * Dispatches transactional notifications via official@sehatai.org (aaPanel SMTP)
 */

let transporterInstance: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed or proxy TLS issues
      },
    });
  }
  return transporterInstance;
}

interface PreRegistrationEmailParams {
  to: string;
  fullName: string;
  hospital: string;
  roleDesignation: string;
}

interface InviteEmailParams {
  to: string;
  fullName: string;
  inviteCode: string;
  role: string;
  allowedScreens?: string[];
  registerUrl?: string;
  loginUrl?: string;
}

export const mailService = {
  /**
   * Sends an acknowledgment email when a clinician pre-registers for the alpha
   */
  async sendAlphaPreRegistrationEmail(params: PreRegistrationEmailParams): Promise<boolean> {
    const { to, fullName, hospital, roleDesignation } = params;
    const subject = 'Rad Suite Alpha Access Request Received';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d1117; color: #e6edf3; border-radius: 12px; overflow: hidden; border: 1px solid #30363d;">
        <div style="background: linear-gradient(135deg, #161b22, #0d1117); padding: 32px 24px; text-align: center; border-bottom: 1px solid #30363d;">
          <div style="display: inline-block; background-color: #238636; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Private Alpha Preview</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Rad Suite Workstation</h1>
          <p style="margin: 6px 0 0; font-size: 14px; color: #8b949e;">Next-Generation Diagnostic Radiology & HMIS Automation</p>
        </div>
        
        <div style="padding: 32px 24px; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${fullName}</strong>,</p>
          <p style="font-size: 14px; color: #c9d1d9;">Thank you for your interest in the <strong>Rad Suite Private Alpha</strong>. We have received your clinical workstation access request for <strong>${hospital}</strong> (${roleDesignation}).</p>
          
          <div style="background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 18px; margin: 24px 0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #8b949e; font-weight: 600; margin-bottom: 8px;">What Happens Next:</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #e6edf3;">
              <li style="margin-bottom: 6px;">Our clinical administration team reviews incoming applications in batches.</li>
              <li style="margin-bottom: 6px;">Once approved, you will receive your personal <strong>Alpha Invite Code</strong> and onboarding instructions.</li>
              <li>You can also activate your account directly via WhatsApp once your invite code is dispatched.</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #8b949e; margin-bottom: 0;">If you have urgent clinical reporting requirements or need expedited access, contact the administration team via <a href="mailto:official@sehatai.org" style="color: #58a6ff; text-decoration: none;">official@sehatai.org</a>.</p>
        </div>

        <div style="background-color: #161b22; padding: 20px 24px; border-top: 1px solid #30363d; font-size: 12px; color: #8b949e; text-align: center;">
          <p style="margin: 0;">Rad Suite Diagnostic Radiology Workstation &copy; 2026 SehatAI</p>
          <p style="margin: 4px 0 0;">Strict Zero-Loss Vault &bull; 256-bit Cryptographic Authentication</p>
        </div>
      </div>
    `;

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: config.smtpFrom,
        to,
        subject,
        html,
      });

      await logAudit({
        userId: 'system',
        userName: 'MailService',
        action: 'dispatch_email',
        entityType: 'PreRegistration',
        details: `Sent alpha pre-registration email to ${to}`,
      });
      return true;
    } catch (err: any) {
      console.warn(`[MAIL_SERVICE_WARN] Failed to send email to ${to}:`, err.message);
      return false;
    }
  },

  /**
   * Sends an invite code email when an admin approves or generates an invite
   */
  async sendAlphaInviteEmail(params: InviteEmailParams): Promise<boolean> {
    const { to, fullName, inviteCode, role, registerUrl, loginUrl } = params;
    const regLink = registerUrl || `${config.appUrl}/register?invite=${inviteCode}`;
    const signinLink = loginUrl || `${config.appUrl}/login`;
    const subject = `Your Rad Suite Alpha Invite Code: ${inviteCode}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d1117; color: #e6edf3; border-radius: 12px; overflow: hidden; border: 1px solid #30363d;">
        <div style="background: linear-gradient(135deg, #161b22, #0d1117); padding: 32px 24px; text-align: center; border-bottom: 1px solid #30363d;">
          <div style="display: inline-block; background-color: #238636; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Alpha Access Granted</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Welcome to Rad Suite</h1>
          <p style="margin: 6px 0 0; font-size: 14px; color: #8b949e;">Your Diagnostic Workstation Invitation is Ready</p>
        </div>
        
        <div style="padding: 32px 24px; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${fullName}</strong>,</p>
          <p style="font-size: 14px; color: #c9d1d9;">Your application for the <strong>Rad Suite Private Alpha</strong> has been approved. You have been provisioned with <strong>${role.toUpperCase()}</strong> clinical permissions.</p>
          
          <div style="background-color: #161b22; border: 2px dashed #238636; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #8b949e; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px;">Your Unique Invite Code</div>
            <div style="font-family: monospace; font-size: 28px; font-weight: 700; color: #3fb950; letter-spacing: 3px;">${inviteCode}</div>
          </div>

          <div style="text-align: center; margin: 32px 0 24px;">
            <a href="${regLink}" style="display: inline-block; background-color: #238636; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(35, 134, 54, 0.4);">Activate Workstation Access</a>
          </div>

          <p style="font-size: 13px; color: #8b949e; text-align: center;">Already have an account? Sign in at <a href="${signinLink}" style="color: #58a6ff; text-decoration: none;">${signinLink}</a> and enter your invite code in the Alpha Standby screen.</p>
        </div>

        <div style="background-color: #161b22; padding: 20px 24px; border-top: 1px solid #30363d; font-size: 12px; color: #8b949e; text-align: center;">
          <p style="margin: 0;">Questions? Contact the clinical operations team at <a href="mailto:official@sehatai.org" style="color: #58a6ff; text-decoration: none;">official@sehatai.org</a></p>
          <p style="margin: 4px 0 0;">Rad Suite by SehatAI &bull; Pakistan Radiology Reporting Network</p>
        </div>
      </div>
    `;

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: config.smtpFrom,
        to,
        subject,
        html,
      });

      await logAudit({
        userId: 'system',
        userName: 'MailService',
        action: 'dispatch_invite_email',
        entityType: 'InviteCode',
        details: `Sent alpha invite code ${inviteCode} to ${to}`,
      });
      return true;
    } catch (err: any) {
      console.warn(`[MAIL_SERVICE_WARN] Failed to send invite email to ${to}:`, err.message);
      return false;
    }
  },
};
