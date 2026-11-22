/**
 * Centralized Configuration & Environment Service
 *
 * Invariant (AGENTS.md Rule 11): Never hardcode domain names, ports, or URLs
 * in code or client components. Always resolve through this module or .env.
 */

export const config = {
  get port(): number {
    return parseInt(process.env.PORT || '3780', 10);
  },

  get appUrl(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || '3780'}`;
  },

  get hmisGatewayUrl(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/hmis-api`;
    }
    return (
      process.env.HMIS_GATEWAY_URL ||
      process.env.NEXT_PUBLIC_HMIS_GATEWAY_URL ||
      'http://localhost:3788'
    );
  },

  get hmisAllowFinalSubmit(): boolean {
    return (
      process.env.HMIS_ALLOW_FINAL_SUBMIT === 'true' ||
      process.env.NEXT_PUBLIC_HMIS_ALLOW_FINAL_SUBMIT === 'true'
    );
  },

  get localLlmUrl(): string {
    return process.env.LOCAL_LLM_URL || 'http://127.0.0.1:8090/v1';
  },

  get ollamaUrl(): string {
    return process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  },

  get voiceStudioUrl(): string {
    return process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
  },

  get apiSecretKey(): string {
    return process.env.API_SECRET_KEY || '';
  },

  get clinicRelayUrl(): string {
    return (
      process.env.CLINIC_RELAY_URL ||
      process.env.NEXT_PUBLIC_CLINIC_RELAY_URL ||
      (process.env.NODE_ENV === 'test' ? 'https://radiology.sehatai.org' : '')
    );
  },

  get centralCloudUrl(): string {
    return (
      process.env.CENTRAL_CLOUD_URL ||
      process.env.NEXT_PUBLIC_CENTRAL_CLOUD_URL ||
      'https://radiology.sehatai.org'
    ).replace(/\/$/, '');
  },

  get clinicNodeSecret(): string {
    return process.env.CLINIC_NODE_SECRET || '';
  },

  get clinicGatewayUrl(): string {
    return (
      process.env.CLINIC_GATEWAY_URL ||
      process.env.NEXT_PUBLIC_CLINIC_GATEWAY_URL ||
      ''
    );
  },

  get clinicGatewayApiKey(): string {
    return process.env.CLINIC_GATEWAY_API_KEY || '';
  },

  get vpsSyncUrl(): string {
    return (
      process.env.VPS_SYNC_URL ||
      process.env.NEXT_PUBLIC_VPS_SYNC_URL ||
      process.env.CLINIC_GATEWAY_URL ||
      ''
    );
  },

  get vpsSyncApiKey(): string {
    return (
      process.env.VPS_SYNC_API_KEY ||
      process.env.CLINIC_GATEWAY_API_KEY ||
      ''
    );
  },

  get smtpHost(): string {
    return process.env.SMTP_HOST || 'localhost';
  },

  get smtpPort(): number {
    return parseInt(process.env.SMTP_PORT || '587', 10);
  },

  get smtpSecure(): boolean {
    return process.env.SMTP_SECURE === 'true';
  },

  get smtpUser(): string {
    return process.env.SMTP_USER || '';
  },

  get smtpPass(): string {
    return process.env.SMTP_PASS || '';
  },

  get smtpFrom(): string {
    return process.env.SMTP_FROM || 'Rad Suite <no-reply@radsuite.local>';
  },

  get appProfile(): 'clinical' | 'atlas' {
    const val = (process.env.APP_PROFILE || process.env.NEXT_PUBLIC_APP_PROFILE || 'clinical').toLowerCase();
    return val === 'atlas' ? 'atlas' : 'clinical';
  },

  get isAtlasMode(): boolean {
    return this.appProfile === 'atlas';
  },

  get isClinicalMode(): boolean {
    return this.appProfile === 'clinical';
  },
};
