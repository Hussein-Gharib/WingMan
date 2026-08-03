import 'server-only';
import { neon } from '@neondatabase/serverless';

// ONE consistent database access pattern for the whole app.
//
// `sql` is ALWAYS a tagged-template function:
//     const rows = await sql`SELECT * FROM menu_items WHERE id = ${id}`;
// It parameterizes every interpolation, so values are never concatenated into
// the query string. It resolves to an array of row objects.
//
//   • Production / when DATABASE_URL is set  -> Neon serverless driver.
//   • Local dev without DATABASE_URL         -> in-process PGlite (see localdb.js).
//
// Because `sql` is never null, "sql is not a function" can no longer occur.

const connectionString = process.env.DATABASE_URL;
export const usingNeon = Boolean(connectionString);
export const hasDatabase = true;

// In production the public site and the admin dashboard MUST read/write the same
// Neon database. If DATABASE_URL is missing in production we must NOT silently
// fall back to demo/PGlite data — that fallback is what makes admin-saved items
// invisible on the public homepage (each serverless instance gets its own
// ephemeral, freshly-seeded store). Fail loudly instead so the misconfiguration
// is fixed rather than masked by seeded demo content.
const isProduction = process.env.NODE_ENV === 'production';

// Build "$1, $2, …" parameterized text from a tagged-template invocation.
function toParamQuery(strings, values) {
  let text = '';
  strings.forEach((part, i) => {
    text += part;
    if (i < values.length) text += `$${i + 1}`;
  });
  return text;
}

let sqlImpl;

if (usingNeon) {
  // neon() returns a tagged-template function that resolves to an array of rows.
  sqlImpl = neon(connectionString);
} else if (isProduction) {
  // Production without a database connection: refuse to serve demo data so the
  // admin and the public site can never diverge. (Thrown at query time, not at
  // import time, so `next build` still succeeds.)
  sqlImpl = async () => {
    throw new Error(
      'DATABASE_URL is not set in production. Add the Neon connection string to the ' +
        'Vercel project environment variables so the public site and admin dashboard ' +
        'share the same live database.',
    );
  };
} else {
  // Local dev only: expose PGlite through the SAME tagged-template contract.
  sqlImpl = async (strings, ...values) => {
    const { initLocalDb } = await import('./localdb.js');
    const db = await initLocalDb();
    const result = await db.query(toParamQuery(strings, values), values);
    return result.rows;
  };
}

export const sql = sqlImpl;
