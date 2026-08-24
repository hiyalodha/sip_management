// Simple in-memory login-attempt tracker to block brute-force login attempts.
// Keyed by email (lowercased). Resets on server restart — fine for a
// college project; a production app would back this with Redis or a DB table.
const attempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function key(email) {
  return String(email || '').trim().toLowerCase();
}

// Returns { locked: boolean, retryAfterSeconds?: number }
function checkLock(email) {
  const entry = attempts.get(key(email));
  if (!entry || !entry.lockedUntil) return { locked: false };
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    attempts.delete(key(email));
    return { locked: false };
  }
  return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

function recordFailure(email) {
  const k = key(email);
  const entry = attempts.get(k) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  attempts.set(k, entry);
  return MAX_ATTEMPTS - entry.count;
}

function recordSuccess(email) {
  attempts.delete(key(email));
}

module.exports = { checkLock, recordFailure, recordSuccess, MAX_ATTEMPTS };
