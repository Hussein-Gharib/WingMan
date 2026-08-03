import { NextResponse } from 'next/server';
import {
  verifyPassword,
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '@/lib/auth';

export async function POST(request) {
  let password = '';
  try {
    const body = await request.json();
    password = body?.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
