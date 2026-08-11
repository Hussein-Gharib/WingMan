import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parse,
  menuItemSchema,
  offerCreateSchema,
  offerActiveSchema,
  categoryCreateSchema,
  reorderSchema,
  settingsSchema,
} from '../lib/validation.js';

test('menu: valid item passes and normalizes prices', () => {
  const { data, error } = parse(menuItemSchema, {
    name: '  Wings  ',
    price_usd: '8.00',
    price_lbp: '600',
    available: true,
  });
  assert.equal(error, undefined);
  assert.equal(data.name, 'Wings');
  assert.equal(data.price_usd, 8);
  assert.equal(data.price_lbp, 600);
});

test('menu: empty name rejected', () => {
  const { error } = parse(menuItemSchema, { name: '' });
  assert.ok(error);
});

test('menu: negative price rejected', () => {
  const { error } = parse(menuItemSchema, { name: 'X', price_usd: '-5' });
  assert.ok(error);
});

test('menu: non-numeric price rejected', () => {
  const { error } = parse(menuItemSchema, { name: 'X', price_lbp: 'abc' });
  assert.ok(error);
});

test('menu: absurdly large price rejected', () => {
  const { error } = parse(menuItemSchema, { name: 'X', price_usd: 1e12 });
  assert.ok(error);
});

test('menu: unexpected extra field rejected (strict)', () => {
  const { error } = parse(menuItemSchema, { name: 'X', evil: 1 });
  assert.ok(error);
});

test('menu: over-long name rejected', () => {
  const { error } = parse(menuItemSchema, { name: 'a'.repeat(121) });
  assert.ok(error);
});

test('menu: empty price string normalizes to null', () => {
  const { data } = parse(menuItemSchema, { name: 'X', price_usd: '', price_lbp: '' });
  assert.equal(data.price_usd, null);
  assert.equal(data.price_lbp, null);
});

test('menu: image_url must be relative or https', () => {
  assert.ok(parse(menuItemSchema, { name: 'X', image_url: 'javascript:alert(1)' }).error);
  assert.ok(parse(menuItemSchema, { name: 'X', image_url: 'http://x/y.jpg' }).error);
  assert.equal(parse(menuItemSchema, { name: 'X', image_url: '/images/a.jpg' }).error, undefined);
  assert.equal(parse(menuItemSchema, { name: 'X', image_url: 'https://x/y.jpg' }).error, undefined);
});

test('offer create: requires image_url', () => {
  assert.ok(parse(offerCreateSchema, { name: 'X' }).error);
  assert.equal(parse(offerCreateSchema, { image_url: 'https://x/y.jpg' }).error, undefined);
});

test('offer active: requires boolean', () => {
  assert.ok(parse(offerActiveSchema, { id: 1, active: 'yes' }).error);
  assert.equal(parse(offerActiveSchema, { id: 1, active: false }).error, undefined);
});

test('category: name required', () => {
  assert.ok(parse(categoryCreateSchema, { name: '' }).error);
  assert.equal(parse(categoryCreateSchema, { name: 'Wings' }).error, undefined);
});

test('reorder: rejects empty and non-integer ids', () => {
  assert.ok(parse(reorderSchema, { orderedIds: [] }).error);
  assert.ok(parse(reorderSchema, { orderedIds: ['x'] }).error);
  assert.equal(parse(reorderSchema, { orderedIds: [3, 1, 2] }).error, undefined);
});

test('settings: whatsapp number stripped to digits', () => {
  const { data } = parse(settingsSchema, { whatsapp_number: '+961 3 123-456' });
  assert.equal(data.whatsapp_number, '9613123456');
});

test('settings: instagram javascript: scheme rejected (XSS guard)', () => {
  assert.ok(parse(settingsSchema, { instagram_url: 'javascript:alert(1)' }).error);
  assert.ok(parse(settingsSchema, { instagram_url: 'data:text/html,<script>1</script>' }).error);
});

test('settings: valid https instagram accepted; empty allowed', () => {
  assert.equal(parse(settingsSchema, { instagram_url: 'https://instagram.com/x' }).error, undefined);
  assert.equal(parse(settingsSchema, { instagram_url: '' }).error, undefined);
});

test('settings: invalid phone characters rejected', () => {
  assert.ok(parse(settingsSchema, { phone_number: '123<script>' }).error);
  assert.equal(parse(settingsSchema, { phone_number: '+961 3 123 456' }).error, undefined);
});

test('settings: unexpected field rejected (strict)', () => {
  assert.ok(parse(settingsSchema, { hacked: true }).error);
});
