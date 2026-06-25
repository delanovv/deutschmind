import seedGraph from "../../data/seedGraph.json" with { type: "json" };
import { transaction } from "../../db/pool.js";

const slugify = (value) => String(value).toLocaleLowerCase("de-DE")
  .replace(/[ä]/g, "ae").replace(/[ö]/g, "oe").replace(/[ü]/g, "ue").replace(/[ß]/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function seedUserGraph(userId) {
  return transaction(async (client) => {
    const existing = await client.query("SELECT 1 FROM webs WHERE user_id=$1 LIMIT 1", [userId]);
    if (existing.rowCount) return { created: false };

    const webIds = new Map();
    for (const topic of seedGraph.nodes.filter((node) => node.type === "topic")) {
      const result = await client.query(
        `INSERT INTO webs(user_id,name,slug,description) VALUES($1,$2,$3,$4) RETURNING id`,
        [userId, topic.label, slugify(topic.label), topic.explanationRu]
      );
      webIds.set(topic.label, result.rows[0].id);
    }

    const nodeIds = new Map();
    for (const node of seedGraph.nodes.filter((item) => item.type !== "topic")) {
      const result = await client.query(
        `INSERT INTO nodes(user_id,web_id,canonical_key,label,type,article,plural,cefr,translation_ru,explanation_ru,collocations,examples,metadata)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb)
         RETURNING id`,
        [userId, webIds.get(node.topic), node.id, node.label, node.type, node.article, node.plural, node.cefr,
          node.translationRu, node.explanationRu, JSON.stringify(node.collocations || []), JSON.stringify(node.examples || []),
          JSON.stringify({ seed: true })]
      );
      nodeIds.set(node.id, result.rows[0].id);
      await client.query(
        `INSERT INTO knowledge(
           user_id,node_id,recognition_score,recall_score,context_score,production_score,
           aggregate_score,status,seen_count,correct_count,last_seen_at
         )
         VALUES($1,$2,$3,$3,$3,$3,$3,$4,$5,$6,$7)`,
        [userId, result.rows[0].id, node.knowledgeScore || 0, node.status || "unknown",
          node.seenCount || 0, node.correctCount || 0, node.lastSeenAt]
      );
    }

    let edgeCount = 0;
    for (const edge of seedGraph.edges) {
      const source = nodeIds.get(edge.source);
      const target = nodeIds.get(edge.target);
      if (!source || !target) continue;
      await client.query(
        `INSERT INTO edges(user_id,source_node_id,target_node_id,type,label_ru) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [userId, source, target, edge.type, edge.labelRu]
      );
      edgeCount += 1;
    }
    return { created: true, webs: webIds.size, nodes: nodeIds.size, edges: edgeCount };
  });
}
