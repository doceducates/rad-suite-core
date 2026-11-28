// Layer 2 (Domain/Services): Desktop App System Browser Authentication Handoff Service
import crypto from 'crypto';
import { getGoogleLoginAuthUrl } from './google-login.service';

interface DesktopAuthEntry {
  id: string;
  status: 'pending' | 'completed' | 'expired';
  sessionToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  targetUrl?: string;
  createdAt: number;
}

// In-memory registry of short-lived desktop authentication handshakes
const desktopAuthStore = new Map<string, DesktopAuthEntry>();
const HANDSHAKE_TTL_MS = 1000 * 60 * 5; // 5 minutes TTL

function purgeExpiredEntries(): void {
  const now = Date.now();
  for (const [id, entry] of desktopAuthStore.entries()) {
    if (now - entry.createdAt > HANDSHAKE_TTL_MS) {
      desktopAuthStore.delete(id);
    }
  }
}

export function initDesktopAuthRequest(options: {
  intent?: 'login' | 'register';
  inviteCode?: string;
  redirect?: string;
  customAppUrl?: string;
}): { id: string; authUrl: string } {
  purgeExpiredEntries();

  const id = `desk_${crypto.randomBytes(20).toString('hex')}`;
  desktopAuthStore.set(id, {
    id,
    status: 'pending',
    createdAt: Date.now(),
  });

  const authUrl = getGoogleLoginAuthUrl({
    intent: options.intent || 'login',
    mode: 'desktop',
    inviteCode: options.inviteCode,
    redirect: options.redirect || '/hmis',
    customAppUrl: options.customAppUrl,
    desktopAuthId: id,
  });

  return { id, authUrl };
}

export function completeDesktopAuthRequest(
  id: string,
  data: {
    sessionToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
    };
    targetUrl: string;
  }
): boolean {
  purgeExpiredEntries();

  const entry = desktopAuthStore.get(id);
  if (!entry) return false;

  entry.status = 'completed';
  entry.sessionToken = data.sessionToken;
  entry.user = data.user;
  entry.targetUrl = data.targetUrl;

  return true;
}

export function pollDesktopAuthRequest(id: string): {
  status: 'pending' | 'completed' | 'expired';
  sessionToken?: string;
  user?: any;
  targetUrl?: string;
} {
  purgeExpiredEntries();

  const entry = desktopAuthStore.get(id);
  if (!entry) {
    return { status: 'expired' };
  }

  if (entry.status === 'completed') {
    // Schedule deletion shortly after consumption so re-polls succeed briefly
    setTimeout(() => {
      desktopAuthStore.delete(id);
    }, 10000);

    return {
      status: 'completed',
      sessionToken: entry.sessionToken,
      user: entry.user,
      targetUrl: entry.targetUrl,
    };
  }

  return { status: 'pending' };
}
