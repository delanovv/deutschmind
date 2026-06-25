import "dotenv/config";
import bcrypt from "bcryptjs";
import { transaction } from "./pool.js";
import seedGraph from "../data/seedGraph.json" with { type: "json" };

const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;
if (!email || !password) throw new Error("Укажи SEED_USER_EMAIL и SEED_USER_PASSWORD");

const slugify = (value) => String(value).toLocaleLowerCase("de-DE")
  .replace(/[ä]/g, "ae").replace(/[ö]/g, "oe").replace(/[ü]/g, "ue").replace(/[ß]/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

await transaction(async (client) => {
  const hash = await bcrypt.hash(password, 12);
  const userResult = await client.query(
    `INSERT INTO users(email,password_hash,display_name) VALUES($1,$2,$3)
     ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
     RETURNING id`,
    [email.toLowerCase(), hash, "DeutschMind"]
  );
  const userId = userResult.rows[0].id;
  const topicNodes = seedGraph.nodes.filter((node) => node.type === "topic");
  const webIds = new Map();
  for (const topic of topicNodes) {
    const result = await client.query(
      `INSERT INTO webs(user_id,name,slug,description) VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id,slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [userId, topic.label, slugify(topic.label), topic.explanationRu]
    );
    webIds.set(topic.label, result.rows[0].id);
  }
  const nodeIds = new Map();
  for (const node of seedGraph.nodes.filter((item) => item.type !== "topic")) {
    const result = await client.query(
      `INSERT INTO nodes(user_id,web_id,canonical_key,label,type,article,plural,cefr,translation_ru,explanation_ru,collocations,examples)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)
       ON CONFLICT(user_id,canonical_key) DO UPDATE SET web_id=EXCLUDED.web_id RETURNING id`,
      [userId, webIds.get(node.topic), node.id, node.label, node.type, node.article, node.plural, node.cefr,
        node.translationRu, node.explanationRu, JSON.stringify(node.collocations || []), JSON.stringify(node.examples || [])]
    );
    nodeIds.set(node.id, result.rows[0].id);
    await client.query(
      `INSERT INTO knowledge(
         user_id,node_id,recognition_score,recall_score,context_score,production_score,
         aggregate_score,status,seen_count,correct_count,last_seen_at
       )
       VALUES($1,$2,$3,$3,$3,$3,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [userId, result.rows[0].id, node.knowledgeScore || 0, node.status || "unknown", node.seenCount || 0, node.correctCount || 0, node.lastSeenAt]
    );
  }
  for (const edge of seedGraph.edges) {
    const source = nodeIds.get(edge.source);
    const target = nodeIds.get(edge.target);
    if (!source || !target) continue;
    await client.query(
      `INSERT INTO edges(user_id,source_node_id,target_node_id,type,label_ru) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [userId, source, target, edge.type, edge.labelRu]
    );
  }
});

console.log(`Seed imported for ${email}`);
process.exit(0);
