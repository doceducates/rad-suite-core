import crypto from 'crypto';

function getCandidateKeys(): Buffer[] {
  const raw = Array.from(
    new Set(
      [
        process.env.ENCRYPTION_KEY,
        process.env.API_SECRET_KEY,
        process.env.AUTH_SECRET,
        'radsuite-hipaa-compliant-master-key-32chars',
      ].filter(Boolean) as string[]
    )
  );
  return raw.map((k) => crypto.createHash('sha256').update(k).digest());
}

/**
 * Encrypts a sensitive string using AES-256-GCM.
 * Output format: enc:<iv-hex>:<auth-tag-hex>:<ciphertext-hex>
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const key = getCandidateKeys()[0];
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Gracefully tries fallback keys if the primary key changed, and returns plain string if unencrypted.
 */
export function decryptSecret(payload: string): string {
  if (!payload || !payload.startsWith('enc:')) {
    return payload || '';
  }

  const parts = payload.split(':');
  if (parts.length !== 4) return '';

  const [, ivHex, authTagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  for (const candidateKey of getCandidateKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', candidateKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Continue to next candidate key
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[CRYPTO_ERROR] Failed to decrypt secret with all candidate keys');
  }
  return '';
}
