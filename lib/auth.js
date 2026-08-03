import { SignJWT, jwtVerify } from 'jose';

// Session auth for the single admin. A signed (HS256) JWT is stored in an
// HTTP-only cookie. This module is edge-safe (uses jose + Web Crypto only) so
// it can run in both middleware and route handlers.

export const SESSION_COOKIE = 'wm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set. Add it to your environment.');
  }
  return new TextEncoder().encode(secret);
}

// Verify a submitted password against ADMIN_PASSWORD.
// Uses a length-aware constant-time-ish comparison to avoid trivial timing leaks.
export function verifyPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = new TextEncoder().encode(String(input));
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSessionToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

// Cookie options shared by login/logout responses.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function clearedCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}
