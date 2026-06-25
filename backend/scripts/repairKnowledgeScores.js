import "dotenv/config";
import { pool, query } from "../src/db/pool.js";
import { calculateReviewScores } from "../src/modules/knowledge/knowledgeService.js";

const affected = (
  await query(
    `SELECT DISTINCT r.user_id,r.node_id
     FROM review_events r`,
  )
).rows;

for (const key of affected) {
  const events = (
    await query(
      `SELECT id,mode,rating,score_before
       FROM review_events
       WHERE user_id=$1 AND node_id=$2
       ORDER BY created_at,id`,
      [key.user_id, key.node_id],
    )
  ).rows;
  if (!events.length) continue;

  const baseline = Number(events[0].score_before) || 0;
  const state = {
    recognition_score: baseline,
    recall_score: baseline,
    context_score: baseline,
    production_score: baseline,
    aggregate_score: baseline,
  };

  for (const event of events) {
    const next = calculateReviewScores(state, event.mode, Number(event.rating));
    state[next.field] = next.modeScore;
    state.aggregate_score = next.aggregate;
    await query("UPDATE review_events SET score_after=$2 WHERE id=$1", [
      event.id,
      next.aggregate,
    ]);
  }

  await query(
    `UPDATE knowledge SET
       recognition_score=$3,recall_score=$4,context_score=$5,production_score=$6,
       aggregate_score=$7::real,status=CASE WHEN $7::real>=70 THEN 'known' WHEN $7::real>=30 THEN 'boundary' ELSE 'unknown' END,
       updated_at=now()
     WHERE user_id=$1 AND node_id=$2`,
    [
      key.user_id,
      key.node_id,
      state.recognition_score,
      state.recall_score,
      state.context_score,
      state.production_score,
      state.aggregate_score,
    ],
  );
}

console.log(`Исправлено узлов: ${affected.length}`);
await pool.end();
