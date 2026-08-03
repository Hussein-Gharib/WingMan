import { NextResponse } from 'next/server';
import { validateImageUpload, uploadImage } from '@/lib/blob';
import { requireAdmin } from '@/lib/adminGuard';

// Accepts a multipart form with a `file` field and returns { url }.
// Restricted to authenticated, same-origin admin requests.
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Do not echo the variable value; just state that storage is unconfigured.
    return NextResponse.json({ error: 'Image storage is not configured.' }, { status: 500 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const file = form.get('file');
  const prefix = form.get('prefix') === 'offers' ? 'offers' : 'menu';

  const check = await validateImageUpload(file);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status || 400 });
  }

  try {
    const url = await uploadImage(check.buffer, check.contentType, prefix);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload failed:', err?.message || err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
