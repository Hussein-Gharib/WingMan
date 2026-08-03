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
} else {
  // Local dev: expose PGlite through the SAME tagged-template contract.
  sqlImpl = async (strings, ...values) => {
    const { initLocalDb } = await import('./localdb.js');
    const db = await initLocalDb();
    const result = await db.query(toParamQuery(strings, values), values);
    return result.rows;
  };
}

export const sql = sqlImpl;
