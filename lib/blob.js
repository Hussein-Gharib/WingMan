import 'server-only';
import { put, del } from '@vercel/blob';

// Vercel Blob helpers for admin-uploaded images only.
// Local /public images are never touched by these functions.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// True only for URLs that live in Vercel Blob storage. Used to guard deletes so
// we never attempt to remove bundled /public assets.
export function isBlobUrl(url) {
  return typeof url === 'string' && url.includes('.public.blob.vercel-storage.com');
}

// Validate an uploaded File. Returns { ok } or { ok:false, error }.
export function validateImage(file) {
  if (!file || typeof file === 'string') return { ok: false, error: 'No file provided.' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Unsupported file type. Use JPEG, PNG, WEBP or GIF.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Image is too large. Maximum size is 5 MB.' };
  }
  return { ok: true };
}

export async function uploadImage(file, prefix = 'uploads') {
  const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '-');
  const key = `${prefix}/${Date.now()}-${safeName}`;
  const blob = await put(key, file, {
    access: 'public',
    addRandomSuffix: true,
  });
  return blob.url;
}

// Best-effort delete of a previously uploaded Blob image. Never throws.
export async function deleteBlobIfOwned(url) {
  if (!isBlobUrl(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.error('Failed to delete blob image:', err);
  }
}
