import { query, transaction } from "../../db/pool.js";

const nodeProjection = `
  n.id, n.web_id AS "webId", n.label, n.type, n.lang, n.article, n.plural, n.cefr,
  n.translation_ru AS "translationRu", n.explanation_ru AS "explanationRu",
  n.collocations, n.examples, n.metadata,
  COALESCE(k.aggregate_score, 0) AS "knowledgeScore",
  COALESCE(k.status, 'unknown') AS status
`;

export async function listWebs(userId) {
  const result = await query(
    `SELECT w.id, w.name, w.slug, w.description, w.icon, w.color, w.generated,
            COUNT(n.id)::int AS "nodeCount",
            COALESCE(ROUND(AVG(k.aggregate_score))::int, 0) AS mastery
     FROM webs w
     LEFT JOIN nodes n ON n.web_id = w.id AND n.user_id = w.user_id
     LEFT JOIN knowledge k ON k.node_id = n.id AND k.user_id = w.user_id
     WHERE w.user_id = $1
     GROUP BY w.id
     ORDER BY w.name`,
    [userId]
  );
  return result.rows;
}

export async function getWeb(userId, webId, { limit = 100, offset = 0 } = {}) {
  const webResult = await query("SELECT * FROM webs WHERE id = $1 AND user_id = $2", [webId, userId]);
  if (!webResult.rowCount) return null;
  const nodes = await query(
    `SELECT ${nodeProjection}
     FROM nodes n
     LEFT JOIN knowledge k ON k.node_id = n.id AND k.user_id = n.user_id
     WHERE n.user_id = $1 AND n.web_id = $2
     ORDER BY n.created_at
     LIMIT $3 OFFSET $4`,
    [userId, webId, Math.min(Number(limit) || 100, 300), Math.max(Number(offset) || 0, 0)]
  );
  const ids = nodes.rows.map((node) => node.id);
  const edges = ids.length
    ? await query(
        `SELECT id, source_node_id AS source, target_node_id AS target, type, label_ru AS "labelRu", weight
         FROM edges
         WHERE user_id = $1 AND source_node_id = ANY($2::uuid[]) AND target_node_id = ANY($2::uuid[])`,
        [userId, ids]
      )
    : { rows: [] };
  return {
    web: webResult.rows[0],
    nodes: nodes.rows.map((node) => ({ ...node, topic: webResult.rows[0].name })),
    edges: edges.rows,
    pagination: { limit: Math.min(Number(limit) || 100, 300), offset: Math.max(Number(offset) || 0, 0) }
  };
}

export async function getNodeNeighbors(userId, nodeId, depth = 1, limit = 80) {
  const safeDepth = Math.max(1, Math.min(Number(depth) || 1, 2));
  const result = await query(
    `WITH RECURSIVE neighborhood(node_id, depth) AS (
       SELECT $2::uuid, 0
       UNION
       SELECT CASE WHEN e.source_node_id = nb.node_id THEN e.target_node_id ELSE e.source_node_id END, nb.depth + 1
       FROM neighborhood nb
       JOIN edges e ON e.user_id = $1
         AND (e.source_node_id = nb.node_id OR e.target_node_id = nb.node_id)
       WHERE nb.depth < $3
     )
     SELECT DISTINCT ${nodeProjection}, MIN(nb.depth)::int AS depth
     FROM neighborhood nb
     JOIN nodes n ON n.id = nb.node_id AND n.user_id = $1
     LEFT JOIN knowledge k ON k.node_id = n.id AND k.user_id = n.user_id
     GROUP BY n.id, k.aggregate_score, k.status
     ORDER BY depth, n.label
     LIMIT $4`,
    [userId, nodeId, safeDepth, Math.min(Number(limit) || 80, 200)]
  );
  const ids = result.rows.map((node) => node.id);
  const edges = ids.length
    ? await query(
        `SELECT id, source_node_id AS source, target_node_id AS target, type, label_ru AS "labelRu", weight
         FROM edges WHERE user_id = $1 AND source_node_id = ANY($2::uuid[]) AND target_node_id = ANY($2::uuid[])`,
        [userId, ids]
      )
    : { rows: [] };
  return { nodes: result.rows, edges: edges.rows, depth: safeDepth };
}

export async function upsertGeneratedBatch(userId, web, nodes, edges = []) {
  return transaction(async (client) => {
    const webResult = await client.query(
      `INSERT INTO webs(user_id, name, slug, description, generated)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT(user_id, slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, updated_at=now()
       RETURNING id`,
      [userId, web.name, web.slug, web.description || null]
    );
    const webId = webResult.rows[0].id;
    const nodeIds = new Map();
    for (const node of nodes) {
      const result = await client.query(
        `INSERT INTO nodes(user_id, web_id, canonical_key, label, type, article, plural, cefr, translation_ru, explanation_ru, collocations, examples, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb)
         ON CONFLICT(user_id, canonical_key) DO UPDATE SET
           web_id=EXCLUDED.web_id, label=EXCLUDED.label, translation_ru=EXCLUDED.translation_ru,
           explanation_ru=EXCLUDED.explanation_ru, collocations=EXCLUDED.collocations,
           examples=EXCLUDED.examples, updated_at=now()
         RETURNING id`,
        [userId, webId, node.canonicalKey, node.label, node.type, node.article || null, node.plural || null,
          node.cefr || null, node.translationRu || null, node.explanationRu || null,
          JSON.stringify(node.collocations || []), JSON.stringify(node.examples || []), JSON.stringify(node.metadata || {})]
      );
      nodeIds.set(node.clientId || node.canonicalKey, result.rows[0].id);
      await client.query(
        `INSERT INTO knowledge(user_id,node_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [userId, result.rows[0].id]
      );
    }
    for (const edge of edges) {
      const source = nodeIds.get(edge.source);
      const target = nodeIds.get(edge.target);
      if (!source || !target) continue;
      await client.query(
        `INSERT INTO edges(user_id,source_node_id,target_node_id,type,label_ru,weight)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [userId, source, target, edge.type, edge.labelRu || null, edge.weight || 1]
      );
    }
    return { webId, nodeIds: Object.fromEntries(nodeIds) };
  });
}
