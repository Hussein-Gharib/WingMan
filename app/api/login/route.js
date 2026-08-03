import { NextResponse } from 'next/server';
import {
  verifyPassword,
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '@/lib/auth';
import { checkLogin, recordFailure, recordSuccess } from '@/lib/rateLimit';
import { clientIp } from '@/lib/adminGuard';

const GENERIC_ERROR = 'Invalid credentials.';

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get('host');
  const forwardedHost = request.headers.get('x-forwarded-host');
  return originHost === host || (forwardedHost && originHost === forwardedHost);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
  // CSRF: only accept same-origin login submissions.
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = clientIp(request);

  // Rate limit BEFORE doing any password work.
  const gate = checkLogin(ip);
  if (!gate.allowed) {
    console.warn(`[security] login rate-limited ip=${ip}`);
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } },
    );
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    const failures = recordFailure(ip);
    // Increasing backoff after each failure (caps at ~4s) to slow brute force.
    await sleep(Math.min(failures * 500, 4000));
    console.warn(`[security] failed admin login ip=${ip} failures=${failures}`);
    // Generic message — never reveal whether a value was close or exists.
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  recordSuccess(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  // Fresh signed session cookie on every successful login (session rotation).
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
