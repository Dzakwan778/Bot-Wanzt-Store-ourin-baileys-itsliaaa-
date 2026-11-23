import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SESSION_TTL_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOGIN_LOCKOUT_DURATION_MS,
  extractBearerToken,
  calculateSessionExpiresAt,
  isSessionExpired,
  evaluateLockoutState,
  computeNextFailedAttempt,
  formatRemainingLockout,
  validatePasswordChange,
  normalizeClientIp,
} from './adminSecurityUtils.ts';

describe('adminSecurityUtils', () => {
  it('extractBearerToken extracts token cleanly regardless of Bearer casing', () => {
    assert.equal(extractBearerToken('Bearer abc123'), 'abc123');
    assert.equal(extractBearerToken('bearer   xyz999  '), 'xyz999');
    assert.equal(extractBearerToken('rawtoken'), 'rawtoken');
    assert.equal(extractBearerToken(undefined), '');
  });

  it('calculates 7-day session expiration and detects expiry accurately', () => {
    const now = 1_700_000_000_000;
    const expiresAt = calculateSessionExpiresAt(now);
    const expectedMs = now + ADMIN_SESSION_TTL_MS;

    assert.equal(Date.parse(expiresAt), expectedMs);
    assert.equal(ADMIN_SESSION_TTL_MS, 7 * 24 * 60 * 60 * 1000);

    assert.equal(isSessionExpired(expiresAt, now + 1000), false);
    assert.equal(isSessionExpired(expiresAt, expectedMs), true);
    assert.equal(isSessionExpired(expiresAt, expectedMs + 1000), true);
    assert.equal(isSessionExpired('invalid-date', now), true);
  });

  it('tracks failed attempts and locks for 15 minutes on the 5th attempt', () => {
    const now = 1_700_000_000_000;

    let count = 0;
    for (let i = 1; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
      const res = computeNextFailedAttempt(count, now);
      assert.equal(res.failedCount, i);
      assert.equal(res.isLocked, false);
      assert.equal(res.lockedUntil, null);
      count = res.failedCount;
    }

    const fifth = computeNextFailedAttempt(count, now);
    assert.equal(fifth.failedCount, 5);
    assert.equal(fifth.isLocked, true);
    assert.ok(fifth.lockedUntil);
    assert.equal(Date.parse(fifth.lockedUntil!), now + LOGIN_LOCKOUT_DURATION_MS);

    const activeLock = evaluateLockoutState(
      { failed_count: fifth.failedCount, locked_until: fifth.lockedUntil },
      now + 60_000
    );
    assert.equal(activeLock.isLocked, true);
    assert.equal(activeLock.remainingSeconds, 14 * 60);

    const expiredLock = evaluateLockoutState(
      { failed_count: fifth.failedCount, locked_until: fifth.lockedUntil },
      now + LOGIN_LOCKOUT_DURATION_MS + 1000
    );
    assert.equal(expiredLock.isLocked, false);
    assert.equal(expiredLock.remainingSeconds, 0);
    assert.equal(expiredLock.activeFailedCount, 0);
  });

  it('formats remaining lockout duration in Indonesian', () => {
    assert.equal(formatRemainingLockout(900), '15 menit');
    assert.equal(formatRemainingLockout(875), '14 menit 35 detik');
    assert.equal(formatRemainingLockout(45), '45 detik');
  });

  it('validates password changes cleanly', () => {
    assert.deepEqual(validatePasswordChange('', 'NewPass@123', 'NewPass@123'), {
      valid: false,
      error: 'Semua kolom password wajib diisi.',
    });
    assert.deepEqual(validatePasswordChange('OldPass@1', 'short', 'short'), {
      valid: false,
      error: 'Password baru minimal 8 karakter.',
    });
    assert.deepEqual(validatePasswordChange('OldPass@1', 'NewPass@123', 'Mismatch@123'), {
      valid: false,
      error: 'Konfirmasi password baru tidak cocok.',
    });
    assert.deepEqual(validatePasswordChange('SamePass@1', 'SamePass@1', 'SamePass@1'), {
      valid: false,
      error: 'Password baru tidak boleh sama dengan password saat ini.',
    });
    assert.deepEqual(validatePasswordChange('OldPass@1', 'NewPass@123', 'NewPass@123'), {
      valid: true,
    });
  });

  it('uses trusted req.ip / socket IP and never trusts spoofed multi-hop headers', () => {
    assert.equal(normalizeClientIp('203.0.113.10', '198.51.100.1'), '203.0.113.10');
    assert.equal(normalizeClientIp('::ffff:198.51.100.25', '127.0.0.1'), '198.51.100.25');
    assert.equal(normalizeClientIp('127.0.0.1', undefined), '127.0.0.1');
    assert.equal(normalizeClientIp(undefined, '::ffff:127.0.0.1'), '127.0.0.1');
    assert.equal(normalizeClientIp('198.51.100.1, 10.0.0.1', '127.0.0.1'), '127.0.0.1');
    assert.equal(normalizeClientIp(undefined, undefined), 'unknown');
  });
});
