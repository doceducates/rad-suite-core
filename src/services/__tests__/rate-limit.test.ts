import { describe, test, expect, beforeEach } from 'vitest';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limit';

describe('Rate Limiter', () => {
  const testKey = 'test-ip:test@example.com';

  beforeEach(() => {
    clearRateLimit(testKey);
  });

  test('initially allows requests', () => {
    const res = checkRateLimit(testKey, 3, 5000);
    expect(res.allowed).toBe(true);
  });

  test('locks out after max attempts reached', () => {
    recordFailedAttempt(testKey, 3, 5000);
    expect(checkRateLimit(testKey, 3, 5000).allowed).toBe(true);

    recordFailedAttempt(testKey, 3, 5000);
    expect(checkRateLimit(testKey, 3, 5000).allowed).toBe(true);

    recordFailedAttempt(testKey, 3, 5000);
    const res = checkRateLimit(testKey, 3, 5000);
    expect(res.allowed).toBe(false);
    expect(res.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('clearing rate limit resets lockout', () => {
    recordFailedAttempt(testKey, 2, 5000);
    recordFailedAttempt(testKey, 2, 5000);
    expect(checkRateLimit(testKey, 2, 5000).allowed).toBe(false);

    clearRateLimit(testKey);
    expect(checkRateLimit(testKey, 2, 5000).allowed).toBe(true);
  });
});
