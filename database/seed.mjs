// Seed the Neon database with the current WingMan categories, menu and offer.
//
// Usage:
//   1. Make sure database/schema.sql has been run against your Neon database.
//   2. Ensure DATABASE_URL is available (this script reads .env automatically).
//   3. Run:  npm run seed
//
// Re-running resets categories, menu_items and offers to the canonical WingMan
// data. It does not overwrite settings you have already edited in the admin
// dashboard.

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { defaultMenu, defaultOffers, defaultCategories } from '../lib/defaultData.js';

// --- Minimal .env loader (no dependency) ---
function loadEnv() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No .env file — rely on the ambient environment.
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set. Add it to .env or your shell.');
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log('Seeding WingMan database...');

  // Reset everything so ids and ordering are deterministic.
  // TRUNCATE ... CASCADE clears menu_items references to categories too.
  await sql`TRUNCATE categories, menu_items, offers RESTART IDENTITY CASCADE`;

  // Categories first (menu items reference them by id).
  for (const c of defaultCategories) {
    await sql`
      INSERT INTO categories (id, name, sort_order)
      VALUES (${c.id}, ${c.name}, ${c.sort_order})`;
  }
  // Keep the identity sequence ahead of the explicit ids we inserted.
  await sql`SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories))`;
  console.log(`  Inserted ${defaultCategories.length} categories.`);

  for (const m of defaultMenu) {
    await sql`
      INSERT INTO menu_items (name, description, price_usd, price_lbp, category_id, image_url, available, sort_order)
      VALUES (${m.name}, ${m.description}, ${m.price_usd}, ${m.price_lbp}, ${m.category_id}, ${m.image_url}, ${m.available}, ${m.sort_order})`;
  }
  console.log(`  Inserted ${defaultMenu.length} menu items.`);

  for (const o of defaultOffers) {
    await sql`
      INSERT INTO offers (name, image_url, price_usd, price_lbp, active, sort_order)
      VALUES (${o.name}, ${o.image_url}, ${o.price_usd}, ${o.price_lbp}, ${o.active}, ${o.sort_order})`;
  }
  console.log(`  Inserted ${defaultOffers.length} offer(s).`);

  // Ensure the singleton settings row exists (does not overwrite edits).
  await sql`INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
  console.log('  Ensured site_settings row.');

  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
