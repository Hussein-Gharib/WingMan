import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { updateSettings } from '@/lib/queries';

// Update site settings (contact info + WhatsApp number/message).
export async function PUT(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  // Normalize the WhatsApp number to digits only (international format,
  // no spaces, no leading +) as required.
  const whatsapp_number = String(body.whatsapp_number || '').replace(/\D/g, '');

  const data = {
    whatsapp_number,
    whatsapp_message: String(body.whatsapp_message || '').trim(),
    phone_number: String(body.phone_number || '').trim(),
    instagram_url: String(body.instagram_url || '').trim(),
    working_hours: String(body.working_hours || '').trim(),
    delivery_areas: String(body.delivery_areas || '').trim(),
  };

  try {
    const settings = await updateSettings(data);
    revalidatePath('/');
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('Settings update failed:', err);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }
}
