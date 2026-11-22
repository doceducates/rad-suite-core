import { db } from '@/db';
import { radiopaediaAccounts, type RadiopaediaAccountSummary, type ConnectAccountInput } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import crypto from 'crypto';

export type { RadiopaediaAccountSummary, ConnectAccountInput };

export async function listRadiopaediaAccounts(): Promise<RadiopaediaAccountSummary[]> {
  try {
    const rows = await db.select().from(radiopaediaAccounts);
    const now = Date.now();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      maskedClientId: r.clientId.length > 8 ? `${r.clientId.slice(0, 4)}...${r.clientId.slice(-4)}` : r.clientId,
      hasToken: Boolean(r.accessToken),
      isExpired: Boolean(r.expiresAt && r.expiresAt < now),
      isActive: Boolean(r.isActive),
      requestsToday: r.requestsToday || 0,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[RadiopaediaPool] Error listing accounts:', err);
    }
    return [];
  }
}

export async function connectRadiopaediaAccount(input: ConnectAccountInput) {
  const { name, clientId, clientSecret, authCode } = input;
  if (!clientId || !clientSecret || !authCode) {
    throw new Error('Client ID, Client Secret, and Authorization Code are required');
  }

  const params = new URLSearchParams({
    code: authCode.trim(),
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    grant_type: 'authorization_code',
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  });

  const res = await fetch('https://radiopaedia.org/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  const expiresAt = Date.now() + (data.expires_in || 86400) * 1000;
  const nowIso = new Date().toISOString();
  const accountId = `rad_acc_${crypto.randomUUID().slice(0, 8)}`;

  await db.insert(radiopaediaAccounts).values({
    id: accountId,
    name: name.trim() || 'Radiopaedia Account',
    clientId: clientId.trim(),
    clientSecret: encryptSecret(clientSecret.trim()),
    accessToken: encryptSecret(data.access_token),
    refreshToken: data.refresh_token ? encryptSecret(data.refresh_token) : null,
    expiresAt,
    isActive: true,
    requestsToday: 0,
    rateLimitResetAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return { success: true, accountId, expiresAt };
}

export async function refreshAccountToken(accountId: string): Promise<string | null> {
  const [acc] = await db
    .select()
    .from(radiopaediaAccounts)
    .where(eq(radiopaediaAccounts.id, accountId))
    .limit(1);

  if (!acc || !acc.refreshToken) return null;

  const rawSecret = decryptSecret(acc.clientSecret);
  const rawRefreshToken = decryptSecret(acc.refreshToken);

  if (!rawSecret || !rawRefreshToken) return null;

  try {
    const params = new URLSearchParams({
      client_id: acc.clientId,
      client_secret: rawSecret,
      refresh_token: rawRefreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://radiopaedia.org/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(3000),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`[RadiopaediaPool] Token refresh failed for ${accountId}:`, data);
      }
      return null;
    }

  const expiresInMs = (data.expires_in || 86400) * 1000;
  const newExpiresAt = Date.now() + expiresInMs;

  await db
    .update(radiopaediaAccounts)
    .set({
      accessToken: encryptSecret(data.access_token),
      refreshToken: data.refresh_token ? encryptSecret(data.refresh_token) : acc.refreshToken,
      expiresAt: newExpiresAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(radiopaediaAccounts.id, accountId));

    return data.access_token;
  } catch {
    return null;
  }
}

export async function getActiveRadiopaediaAccount(): Promise<{
  id: string;
  name: string;
  accessToken: string;
} | null> {
  try {
    const rows = await db
      .select()
      .from(radiopaediaAccounts)
      .where(eq(radiopaediaAccounts.isActive, true));

    if (!rows || rows.length === 0) return null;

    // Pick healthiest account with least requests today (round-robin balancing)
    rows.sort((a, b) => (a.requestsToday || 0) - (b.requestsToday || 0));
    const candidate = rows[0];

    let token = candidate.accessToken ? decryptSecret(candidate.accessToken) : null;
    const now = Date.now();

    // Auto-refresh if token expires within 5 minutes
    if (!token || (candidate.expiresAt && candidate.expiresAt - now < 300000)) {
      token = await refreshAccountToken(candidate.id);
    }

    if (!token) return null;

    // Increment request counter
    await db
      .update(radiopaediaAccounts)
      .set({
        requestsToday: (candidate.requestsToday || 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(radiopaediaAccounts.id, candidate.id));

    return { id: candidate.id, name: candidate.name, accessToken: token };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[RadiopaediaPool] Error selecting active account:', err);
    }
    return null;
  }
}

export async function deleteRadiopaediaAccount(accountId: string) {
  await db.delete(radiopaediaAccounts).where(eq(radiopaediaAccounts.id, accountId));
  return true;
}

export async function toggleRadiopaediaAccount(accountId: string, isActive: boolean) {
  await db
    .update(radiopaediaAccounts)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(radiopaediaAccounts.id, accountId));
  return true;
}
