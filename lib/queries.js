import 'server-only';
import { sql } from './db.js';

// All database access lives here. Every function runs on the server only and
// uses the single parameterized tagged-template `sql` client from lib/db.js
// (Neon in production, PGlite locally). No raw SQL strings are built by hand.

// Normalize an optional numeric field: '' / undefined -> null.
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// ---------------- Categories ----------------

export async function getCategories() {
  return sql`SELECT * FROM categories ORDER BY sort_order, id`;
}

export async function createCategory({ name, sort_order = 99 }) {
  const rows = await sql`
    INSERT INTO categories (name, sort_order)
    VALUES (${name}, ${sort_order})
    RETURNING *`;
  return rows[0];
}

export async function updateCategory(id, { name }) {
  const rows = await sql`UPDATE categories SET name = ${name} WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function deleteCategory(id) {
  // Menu items referencing this category are set to NULL (uncategorized) by the
  // ON DELETE SET NULL foreign key.
  const rows = await sql`DELETE FROM categories WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function reorderCategories(orderedIds) {
  for (let i = 0; i < orderedIds.length; i += 1) {
    await sql`UPDATE categories SET sort_order = ${i + 1} WHERE id = ${orderedIds[i]}`;
  }
}

// ---------------- Menu reads ----------------

export async function getMenu({ onlyAvailable = false } = {}) {
  if (onlyAvailable) {
    return sql`
      SELECT m.*, c.name AS category_name
      FROM menu_items m
      LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.available = TRUE
      ORDER BY m.sort_order, m.id`;
  }
  return sql`
    SELECT m.*, c.name AS category_name
    FROM menu_items m
    LEFT JOIN categories c ON c.id = m.category_id
    ORDER BY m.sort_order, m.id`;
}

export async function getMenuItem(id) {
  const rows = await sql`SELECT * FROM menu_items WHERE id = ${id}`;
  return rows[0] ?? null;
}

// ---------------- Menu mutations ----------------

export async function createMenuItem(data) {
  const rows = await sql`
    INSERT INTO menu_items (name, description, price_usd, price_lbp, category_id, image_url, available, sort_order)
    VALUES (
      ${data.name},
      ${data.description ?? ''},
      ${num(data.price_usd)},
      ${num(data.price_lbp)},
      ${data.category_id ?? null},
      ${data.image_url ?? ''},
      ${data.available ?? true},
      ${data.sort_order ?? 99}
    )
    RETURNING *`;
  return rows[0];
}

export async function updateMenuItem(id, data) {
  const rows = await sql`
    UPDATE menu_items SET
      name        = ${data.name},
      description = ${data.description ?? ''},
      price_usd   = ${num(data.price_usd)},
      price_lbp   = ${num(data.price_lbp)},
      category_id = ${data.category_id ?? null},
      image_url   = ${data.image_url ?? ''},
      available   = ${data.available ?? true},
      updated_at  = now()
    WHERE id = ${id}
    RETURNING *`;
  return rows[0];
}

export async function deleteMenuItem(id) {
  const rows = await sql`DELETE FROM menu_items WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function reorderMenu(orderedIds) {
  for (let i = 0; i < orderedIds.length; i += 1) {
    await sql`UPDATE menu_items SET sort_order = ${i + 1}, updated_at = now() WHERE id = ${orderedIds[i]}`;
  }
}

// ---------------- Offers ----------------

export async function getOffers({ onlyActive = false } = {}) {
  if (onlyActive) {
    return sql`SELECT * FROM offers WHERE active = TRUE ORDER BY sort_order, id`;
  }
  return sql`SELECT * FROM offers ORDER BY sort_order, id`;
}

export async function getOffer(id) {
  const rows = await sql`SELECT * FROM offers WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function createOffer(data) {
  const rows = await sql`
    INSERT INTO offers (name, image_url, price_usd, price_lbp, active, sort_order)
    VALUES (
      ${data.name ?? ''},
      ${data.image_url},
      ${num(data.price_usd)},
      ${num(data.price_lbp)},
      ${data.active ?? true},
      ${data.sort_order ?? 99}
    )
    RETURNING *`;
  return rows[0];
}

// Update editable offer fields (name + prices). Image is handled separately.
export async function updateOffer(id, data) {
  const rows = await sql`
    UPDATE offers SET
      name      = ${data.name ?? ''},
      price_usd = ${num(data.price_usd)},
      price_lbp = ${num(data.price_lbp)}
    WHERE id = ${id}
    RETURNING *`;
  return rows[0] ?? null;
}

export async function updateOfferImage(id, image_url) {
  const rows = await sql`UPDATE offers SET image_url = ${image_url} WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function setOfferActive(id, active) {
  const rows = await sql`UPDATE offers SET active = ${active} WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function deleteOffer(id) {
  const rows = await sql`DELETE FROM offers WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function reorderOffers(orderedIds) {
  for (let i = 0; i < orderedIds.length; i += 1) {
    await sql`UPDATE offers SET sort_order = ${i + 1} WHERE id = ${orderedIds[i]}`;
  }
}

// ---------------- Settings ----------------

export async function getSettings() {
  const rows = await sql`SELECT * FROM site_settings WHERE id = 1`;
  return rows[0] ?? {
    id: 1,
    whatsapp_number: '',
    whatsapp_message: 'Hi WingMan! I would like to place an order.',
    phone_number: '',
    instagram_url: '',
    working_hours: '',
    delivery_areas: '',
  };
}

export async function updateSettings(data) {
  const rows = await sql`
    UPDATE site_settings SET
      whatsapp_number  = ${data.whatsapp_number ?? ''},
      whatsapp_message = ${data.whatsapp_message ?? ''},
      phone_number     = ${data.phone_number ?? ''},
      instagram_url    = ${data.instagram_url ?? ''},
      working_hours    = ${data.working_hours ?? ''},
      delivery_areas   = ${data.delivery_areas ?? ''},
      updated_at       = now()
    WHERE id = 1
    RETURNING *`;
  return rows[0];
}
