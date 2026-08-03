import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defaultCategories, defaultMenu, defaultOffers } from './defaultData.js';

// Local development database.
//
// When DATABASE_URL is not set (i.e. Neon is not connected yet), the app uses
// an in-process PostgreSQL (PGlite) so the full site — including all admin
// writes — works locally with zero setup. It is persisted to a local folder and
// auto-seeded from the canonical WingMan data on first run.
//
// This module is only ever imported by lib/db.js when Neon is absent, so it is
// never bundled into production (where DATABASE_URL is always set).

let initPromise = null;

async function build() {
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = path.join(process.cwd(), '.wingman-local-db');
  const db = new PGlite(dataDir);

  // Apply the real schema (CREATE TABLE IF NOT EXISTS … — safe to re-run).
  const schema = readFileSync(path.join(process.cwd(), 'database', 'schema.sql'), 'utf8');
  await db.exec(schema);

  // Seed once, only if empty.
  const { rows } = await db.query('SELECT count(*)::int AS n FROM menu_items');
  if (rows[0].n === 0) {
    for (const c of defaultCategories) {
      await db.query('INSERT INTO categories (id, name, sort_order) VALUES ($1, $2, $3)', [c.id, c.name, c.sort_order]);
    }
    await db.query("SELECT setval(pg_get_serial_sequence('categories','id'), (SELECT COALESCE(MAX(id), 1) FROM categories))");

    for (const m of defaultMenu) {
      await db.query(
        `INSERT INTO menu_items (name, description, price_usd, price_lbp, category_id, image_url, available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [m.name, m.description, m.price_usd, m.price_lbp, m.category_id, m.image_url, m.available, m.sort_order],
      );
    }
    for (const o of defaultOffers) {
      await db.query(
        `INSERT INTO offers (name, image_url, price_usd, price_lbp, active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [o.name, o.image_url, o.price_usd, o.price_lbp, o.active, o.sort_order],
      );
    }
  }

  return db;
}

export function initLocalDb() {
  if (!initPromise) initPromise = build();
  return initPromise;
}
