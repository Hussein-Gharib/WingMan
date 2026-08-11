import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType, validateImageUpload, isBlobUrl, MAX_UPLOAD_BYTES } from '../lib/blob.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const html = Buffer.from('<!doctype html><script>alert(1)</script>');

// Minimal File-like stand-in for validateImageUpload.
function fakeFile(buffer, name) {
  return {
    name,
    size: buffer.length,
    async arrayBuffer() {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  };
}

test('detectImageType recognises JPEG/PNG/WebP by magic bytes', () => {
  assert.equal(detectImageType(jpeg), 'image/jpeg');
  assert.equal(detectImageType(png), 'image/png');
  assert.equal(detectImageType(webp), 'image/webp');
});

test('detectImageType rejects SVG and HTML', () => {
  assert.equal(detectImageType(svg), null);
  assert.equal(detectImageType(html), null);
});

test('detectImageType rejects too-short buffers', () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null);
});

test('validateImageUpload accepts a real JPEG', async () => {
  const res = await validateImageUpload(fakeFile(jpeg, 'photo.jpg'));
  assert.equal(res.ok, true);
  assert.equal(res.contentType, 'image/jpeg');
});

test('validateImageUpload rejects an SVG disguised as .jpg (magic bytes win)', async () => {
  const res = await validateImageUpload(fakeFile(svg, 'evil.jpg'));
  assert.equal(res.ok, false);
});

test('validateImageUpload rejects extension/content mismatch', async () => {
  const res = await validateImageUpload(fakeFile(jpeg, 'photo.png'));
  assert.equal(res.ok, false);
});

test('validateImageUpload rejects a disallowed extension', async () => {
  const res = await validateImageUpload(fakeFile(jpeg, 'shell.php'));
  assert.equal(res.ok, false);
});

test('validateImageUpload rejects a path-traversal filename with a bogus extension', async () => {
  // '../../etc/passwd'.split('.').pop() === '/etc/passwd', which is not an allowed
  // image extension, so the upload is rejected. The filename is never used as a
  // path regardless (uploads are stored under a random UUID key), so rejecting it
  // is a safe, strict default.
  const res = await validateImageUpload(fakeFile(png, '../../etc/passwd'));
  assert.equal(res.ok, false);
  assert.equal(res.status, 400);
});

test('validateImageUpload accepts a dotless filename by content alone', async () => {
  // No '.' in the name -> no extension to check -> validated by magic bytes only.
  const res = await validateImageUpload(fakeFile(png, 'passwd'));
  assert.equal(res.ok, true);
  assert.equal(res.contentType, 'image/png');
});

test('validateImageUpload rejects a file over the size cap', async () => {
  const big = { name: 'big.jpg', size: MAX_UPLOAD_BYTES + 1, async arrayBuffer() { return jpeg.buffer; } };
  const res = await validateImageUpload(big);
  assert.equal(res.ok, false);
  assert.equal(res.status, 413);
});

test('validateImageUpload rejects a missing/empty file', async () => {
  assert.equal((await validateImageUpload(null)).ok, false);
  assert.equal((await validateImageUpload('not-a-file')).ok, false);
});

test('isBlobUrl only matches Vercel Blob hosts', () => {
  assert.equal(isBlobUrl('https://abc.public.blob.vercel-storage.com/x.jpg'), true);
  assert.equal(isBlobUrl('/images/menu/a.jpg'), false);
  assert.equal(isBlobUrl('https://evil.com/x.jpg'), false);
});
