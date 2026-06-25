import pg from "pg";

const { Pool } = pg;

export const databaseEnabled = Boolean(process.env.DATABASE_URL);

export const pool = databaseEnabled
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_SIZE) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.NODE_ENV === "production" && process.env.DB_SSL !== "false"
        ? { rejectUnauthorized: false }
        : false
    })
  : null;

export async function query(text, params = []) {
  if (!pool) throw new Error("DATABASE_URL не настроен");
  return pool.query(text, params);
}

export async function transaction(callback) {
  if (!pool) throw new Error("DATABASE_URL не настроен");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabase() {
  if (!pool) return { enabled: false, ok: false };
  const result = await pool.query("SELECT now() AS now");
  return { enabled: true, ok: true, now: result.rows[0].now };
}

