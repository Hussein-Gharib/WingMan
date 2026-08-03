import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { updateSettings } from '@/lib/queries';
import { requireAdmin } from '@/lib/adminGuard';
import { parse, settingsSchema } from '@/lib/validation';

// Update site settings (contact info + WhatsApp number/message).
export async function PUT(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { data, error } = parse(settingsSchema, body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const settings = await updateSettings(data);
    revalidatePath('/');
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('Settings update failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }
}
