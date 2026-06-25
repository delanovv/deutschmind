import { query } from "../../db/pool.js";

export async function findUserByEmail(email) {
  const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query(
    "SELECT id, email, display_name, native_language, target_language, preferences, created_at FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser({ email, passwordHash, displayName }) {
  const result = await query(
    `INSERT INTO users(email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, native_language, target_language, preferences, created_at`,
    [email.toLowerCase(), passwordHash, displayName || null]
  );
  return result.rows[0];
}

export async function updateUserPreferences(userId, preferences) {
  const result = await query(
    `UPDATE users SET preferences = $2::jsonb, updated_at = now()
     WHERE id = $1
     RETURNING id, email, display_name, native_language, target_language, preferences, created_at`,
    [userId, JSON.stringify(preferences)]
  );
  return result.rows[0];
}

