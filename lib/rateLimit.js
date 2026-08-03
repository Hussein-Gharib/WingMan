import 'server-only';

// In-memory, per-IP rate limiter for the admin login endpoint.
//
// Best-effort brute-force protection: a maximum of MAX_ATTEMPTS failed logins
// per IP within WINDOW_MS. Because Vercel runs multiple isolated serverless
// instances, this is per-instance and NOT a substitute for an edge rate limit —
// it is a strong local backstop. Configure the Vercel Firewall rule documented
// in SECURITY.md for a global, pre-function limit.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // failed attempts per window
const MAX_ENTRIES = 10_000; // guard against unbounded memory growth

const buckets = new Map(); // ip -> { count, firstAt }

function sweep(now) {
  if (buckets.size < MAX_ENTRIES) return;
  for (const [ip, rec] of buckets) {
    if (now - rec.firstAt > WINDOW_MS) buckets.delete(ip);
  }
}

// Call BEFORE checking the password. Returns whether the attempt may proceed and
// how many failures have already accumulated (used for the backoff delay).
export function checkLogin(ip) {
  const now = Date.now();
  const rec = buckets.get(ip);
  if (rec && now - rec.firstAt > WINDOW_MS) {
    buckets.delete(ip);
  }
  const cur = buckets.get(ip);
  if (cur && cur.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((cur.firstAt + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter, failures: cur.count };
  }
  return { allowed: true, retryAfter: 0, failures: cur?.count ?? 0 };
}

// Call after a FAILED password check. Returns the running failure count.
export function recordFailure(ip) {
  const now = Date.now();
  sweep(now);
  const rec = buckets.get(ip);
  if (rec && now - rec.firstAt <= WINDOW_MS) {
    rec.count += 1;
    return rec.count;
  }
  buckets.set(ip, { count: 1, firstAt: now });
  return 1;
}

// Call after a SUCCESSFUL login to clear the IP's failure history.
export function recordSuccess(ip) {
  buckets.delete(ip);
}

export const RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS };
