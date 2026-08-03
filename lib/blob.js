import 'server-only';
import { randomUUID } from 'node:crypto';
import { put, del } from '@vercel/blob';

// Vercel Blob helpers for admin-uploaded images only.
// Local /public images are never touched by these functions.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// Only real raster image formats. SVG/HTML/scripts are intentionally excluded
// (SVG can carry active content). Maps content type -> canonical extension.
const TYPE_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

// True only for URLs that live in Vercel Blob storage. Used to guard deletes so
// we never attempt to remove bundled /public assets.
export function isBlobUrl(url) {
  return typeof url === 'string' && url.includes('.public.blob.vercel-storage.com');
}

// Detect the real image type from the file's magic bytes — never trust the
// client-supplied MIME type or filename. Returns a content type or null.
export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  // WebP: "RIFF"...."WEBP"
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  return null;
}

// Validate an uploaded image by BOTH content (magic bytes) and, when present, the
// filename extension. Returns { ok, buffer, contentType } or { ok:false, error, status }.
export async function validateImageUpload(file) {
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return { ok: false, error: 'No file provided.', status: 400 };
  }
  if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Image is too large. Maximum size is 5 MB.', status: 413 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Image is too large. Maximum size is 5 MB.', status: 413 };
  }

  const contentType = detectImageType(buffer);
  if (!contentType) {
    return { ok: false, error: 'Unsupported file type. Use JPEG, PNG or WEBP.', status: 400 };
  }

  // If the filename carries an extension, it must be an allowed image extension
  // AND consistent with the detected type (blocks e.g. shell.php.jpg mismatch).
  const rawExt = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (rawExt && String(file.name || '').includes('.')) {
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return { ok: false, error: 'Unsupported file extension.', status: 400 };
    }
    const normalized = rawExt === 'jpeg' ? 'jpg' : rawExt;
    if (normalized !== TYPE_TO_EXT[contentType]) {
      return { ok: false, error: 'File extension does not match its contents.', status: 400 };
    }
  }

  return { ok: true, buffer, contentType };
}

// Upload validated bytes under a random, path-safe key. The filename is a fresh
// UUID (plus Blob's random suffix), so uploads can never traverse paths or
// overwrite an existing/unrelated object.
export async function uploadImage(buffer, contentType, prefix = 'uploads') {
  const safePrefix = prefix === 'offers' ? 'offers' : 'menu';
  const ext = TYPE_TO_EXT[contentType] || 'bin';
  const key = `${safePrefix}/${randomUUID()}.${ext}`;
  const blob = await put(key, buffer, {
    access: 'public',
    contentType,
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
    console.error('Failed to delete blob image:', err?.message || err);
  }
}
