import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './auth.js';

// Server-side authorization + CSRF guard for admin route handlers.
//
// Every admin API route calls requireAdmin() as its first step. This does NOT
// rely on middleware alone (defense in depth): even if the matcher changes or
// middleware is bypassed, the handler still refuses unauthenticated or
// cross-origin state-changing requests.

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Client IP, best-effort, from the standard proxy headers Vercel sets.
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

// CSRF defense: a state-changing request must be same-origin. Browsers always
// send an Origin header on POST/PUT/PATCH/DELETE; we require it to match the
// request Host. This rejects classic cross-site form/fetch CSRF without needing
// a per-form token.
function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false; // No Origin on a mutating request -> reject.
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

// Returns a NextResponse to short-circuit with (401/403) when the request is not
// an authorized same-origin admin request, or null when it is allowed to run.
export async function requireAdmin(request) {
  const method = (request.method || 'GET').toUpperCase();

  if (MUTATING_METHODS.has(method) && !isSameOrigin(request)) {
    console.warn(
      `[security] blocked cross-origin ${method} ${new URL(request.url).pathname} from ${clientIp(request)}`,
    );
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    console.warn(
      `[security] unauthorized ${method} ${new URL(request.url).pathname} from ${clientIp(request)}`,
    );
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}
