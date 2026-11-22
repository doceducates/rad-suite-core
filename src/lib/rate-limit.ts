/**
 * In-memory sliding rate limiter for sensitive endpoints (e.g. auth login).
 * Enforces brute-force protection without requiring Redis in standalone/desktop deployment.
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const attemptStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 10 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptStore.entries()) {
      if (record.lockedUntil && record.lockedUntil < now) {
        attemptStore.delete(key);
      } else if (now - record.firstAttemptAt > 60 * 60 * 1000) {
        attemptStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  lockoutDurationMs = 15 * 60 * 1000
): { allowed: boolean; retryAfterSeconds?: number } {
  const record = attemptStore.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    attemptStore.delete(key);
    return { allowed: true };
  }

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutDurationMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(lockoutDurationMs / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailedAttempt(
  key: string,
  maxAttempts = 5,
  lockoutDurationMs = 15 * 60 * 1000
): void {
  const now = Date.now();
  const record = attemptStore.get(key);

  if (!record) {
    attemptStore.set(key, { attempts: 1, firstAttemptAt: now });
    return;
  }

  // If previous window was more than lockoutDurationMs ago, reset window
  if (now - record.firstAttemptAt > lockoutDurationMs && !record.lockedUntil) {
    attemptStore.set(key, { attempts: 1, firstAttemptAt: now });
    return;
  }

  record.attempts += 1;
  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutDurationMs;
  }
}

export function clearRateLimit(key: string): void {
  attemptStore.delete(key);
}
