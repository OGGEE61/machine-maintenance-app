// Applies any migrations not yet recorded in the database, each in its own transaction.
// Usage: npm run db:migrate (uses POSTGRES_URL from .env.local, so check which database that is)
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const dir = path.join(import.meta.dirname, '..', 'migrations');
const sql = neon(process.env.POSTGRES_URL);

console.log(`Database host: ${new URL(process.env.POSTGRES_URL).hostname}`);

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

const applied = new Set((await sql`SELECT name FROM schema_migrations`).map((row) => row.name));
const pending = fs.readdirSync(dir).filter((file) => file.endsWith('.sql') && !applied.has(file)).sort();

for (const file of pending) {
  const statements = fs.readFileSync(path.join(dir, file), 'utf8')
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  await sql.transaction([
    ...statements.map((statement) => sql.query(statement)),
    sql`INSERT INTO schema_migrations (name) VALUES (${file})`,
  ]);
  console.log(`Applied ${file}`);
}

console.log(pending.length ? 'Migrations complete.' : 'Already up to date.');
