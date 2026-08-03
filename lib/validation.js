import { z } from 'zod';

// Server-side input validation for every admin mutation. Client-side checks are
// never trusted. All object schemas are `.strict()` so unexpected fields are
// rejected. Parsing normalizes the loose shapes the admin UI sends (numeric
// strings, '' for "unset") into clean values for the queries layer.

export const LIMITS = {
  NAME: 120,
  DESCRIPTION: 500,
  URL: 2048,
  TEXT: 500,
  PHONE: 40,
  WHATSAPP: 20,
  MAX_PRICE: 1_000_000_000,
  MAX_IDS: 1000,
};

// '' | null | undefined -> null. Otherwise a finite, non-negative number within
// range (accepts numeric strings, since the UI sends prices as text inputs).
// Rejects NaN, Infinity, negatives, and absurd magnitudes.
const looseOptionalPrice = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isNaN(n) ? v : n; // leave non-numeric string to fail validation
    }
    return v;
  },
  z
    .number({ invalid_type_error: 'Price must be a number.' })
    .finite()
    .nonnegative('Price must be positive.')
    .max(LIMITS.MAX_PRICE, 'Price is too large.')
    .nullable(),
);

// Positive integer id; accepts numeric strings.
const idField = z.coerce
  .number({ invalid_type_error: 'Invalid id.' })
  .int('Invalid id.')
  .positive('Invalid id.')
  .max(Number.MAX_SAFE_INTEGER);

// Optional category id: '' | null -> null, else positive integer.
const optionalId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
);

// Image URL: empty, a bundled absolute path (/images/...), or an https URL.
// Blocks javascript:, data:, and other unexpected schemes.
const imageUrl = z
  .string()
  .trim()
  .max(LIMITS.URL)
  .refine(
    (v) => v === '' || v.startsWith('/') || /^https:\/\//i.test(v),
    'Invalid image URL.',
  );

const requiredImageUrl = z
  .string()
  .trim()
  .min(1, 'Image is required.')
  .max(LIMITS.URL)
  .refine(
    (v) => v.startsWith('/') || /^https:\/\//i.test(v),
    'Invalid image URL.',
  );

const name = z.string().trim().min(1, 'Name is required.').max(LIMITS.NAME, 'Name is too long.');
const optionalName = z.string().trim().max(LIMITS.NAME, 'Name is too long.').default('');
const description = z.string().trim().max(LIMITS.DESCRIPTION, 'Description is too long.').default('');

export const menuItemSchema = z
  .object({
    id: idField.nullable().optional(),
    name,
    description: description.optional(),
    price_usd: looseOptionalPrice.optional(),
    price_lbp: looseOptionalPrice.optional(),
    category_id: optionalId.optional(),
    image_url: imageUrl.optional().default(''),
    available: z.boolean().optional().default(true),
  })
  .strict();

export const offerCreateSchema = z
  .object({
    name: optionalName,
    image_url: requiredImageUrl,
    price_usd: looseOptionalPrice.optional(),
    price_lbp: looseOptionalPrice.optional(),
  })
  .strict();

export const offerEditSchema = z
  .object({
    id: idField,
    name: optionalName,
    price_usd: looseOptionalPrice.optional(),
    price_lbp: looseOptionalPrice.optional(),
  })
  .strict();

export const offerImageSchema = z
  .object({
    id: idField,
    image_url: requiredImageUrl,
  })
  .strict();

export const offerActiveSchema = z
  .object({
    id: idField,
    active: z.boolean(),
  })
  .strict();

export const categoryCreateSchema = z.object({ name }).strict();
export const categoryRenameSchema = z.object({ id: idField, name }).strict();

export const reorderSchema = z
  .object({
    orderedIds: z.array(idField).min(1).max(LIMITS.MAX_IDS),
  })
  .strict();

export const settingsSchema = z
  .object({
    whatsapp_number: z
      .preprocess((v) => String(v ?? '').replace(/\D/g, ''), z.string().max(LIMITS.WHATSAPP))
      .default(''),
    whatsapp_message: z.string().trim().max(LIMITS.TEXT).default(''),
    phone_number: z
      .string()
      .trim()
      .max(LIMITS.PHONE)
      .regex(/^[\d+()\-\s]*$/, 'Invalid phone number.')
      .default(''),
    instagram_url: z
      .union([z.literal(''), z.string().trim().url('Invalid Instagram URL.').max(LIMITS.URL)])
      .default(''),
    working_hours: z.string().trim().max(LIMITS.TEXT).default(''),
    delivery_areas: z.string().trim().max(LIMITS.TEXT).default(''),
  })
  .strict();

// Parse `body` with `schema`. Returns { data } or { error } with a single
// user-safe message (no stack traces, no field internals beyond the message).
export function parse(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) return { data: result.data };
  const first = result.error.issues[0];
  return { error: first?.message || 'Invalid request.' };
}
