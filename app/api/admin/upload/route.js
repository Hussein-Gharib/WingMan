import { NextResponse } from 'next/server';
import { validateImage, uploadImage } from '@/lib/blob';

// Protected by middleware (matcher covers /api/admin/*).
// Accepts a multipart form with a `file` field and returns { url }.
export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Image storage is not configured (missing BLOB_READ_WRITE_TOKEN).' },
      { status: 500 },
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const file = form.get('file');
  const prefix = form.get('prefix') === 'offers' ? 'offers' : 'menu';

  const check = validateImage(file);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  try {
    const url = await uploadImage(file, prefix);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload failed:', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
