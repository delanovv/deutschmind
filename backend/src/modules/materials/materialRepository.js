import { query } from "../../db/pool.js";

export async function createMaterial({ userId, title, type, storageKey, sourceText, expiresAt }) {
  const result = await query(
    `INSERT INTO materials(user_id,title,type,storage_key,source_text,status,expires_at)
     VALUES($1,$2,$3,$4,$5,'pending',$6) RETURNING *`,
    [userId, title || null, type, storageKey || null, sourceText || null, expiresAt || null]
  );
  return result.rows[0];
}

export async function listMaterials(userId, { limit = 20, offset = 0 } = {}) {
  const result = await query(
    `SELECT id,title,type,status,analysis,error_message AS "errorMessage",created_at AS "createdAt",updated_at AS "updatedAt"
     FROM materials WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, Math.min(Number(limit) || 20, 100), Math.max(Number(offset) || 0, 0)]
  );
  return result.rows;
}

export async function getMaterial(userId, id) {
  const result = await query(
    `SELECT id,title,type,status,source_text AS "sourceText",analysis,error_message AS "errorMessage",
            created_at AS "createdAt",updated_at AS "updatedAt"
     FROM materials WHERE id=$1 AND user_id=$2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

