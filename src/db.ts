import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ensures the pages table exists (idempotent)
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

let schemaReady: Promise<void> | null = null;

export async function query(text: string, params?: any[]) {
  if (!schemaReady) schemaReady = ensureSchema();
  await schemaReady;
  const res = await pool.query(text, params);
  return res;
}
