import { transaction } from "../../db/pool.js";

const weights = {
  recognition: 0.2,
  recall: 0.3,
  context: 0.25,
  production: 0.25,
};

function currentScores(current) {
  const scores = {
    recognition: Number(current.recognition_score),
    recall: Number(current.recall_score),
    context: Number(current.context_score),
    production: Number(current.production_score),
  };
  const aggregate = Number(current.aggregate_score) || 0;
  const hasDimensionHistory = Object.values(scores).some((score) => score > 0);

  // Older seed data stored only aggregate_score. Treat that aggregate as the
  // starting confidence in every dimension instead of silently replacing it
  // with four zeroes on the first review.
  if (!hasDimensionHistory && aggregate > 0) {
    return Object.fromEntries(
      Object.keys(scores).map((key) => [key, aggregate]),
    );
  }
  return scores;
}

export function calculateReviewScores(current, mode, rating) {
  const scores = currentScores(current);
  const field = `${mode}_score`;
  const modeScore = Math.round(
    scores[mode] * 0.72 + (rating / 3) * 100 * 0.28,
  );
  scores[mode] = modeScore;
  let aggregate = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + scores[key] * weight,
    0,
  );

  // A confident "Знаю" answer must never reduce the displayed confidence.
  if (rating === 3) {
    aggregate = Math.max(Number(current.aggregate_score) || 0, aggregate);
  }
  return { field, modeScore, scores, aggregate };
}

function statusFromScore(score) {
  if (score >= 70) return "known";
  if (score >= 30) return "boundary";
  return "unknown";
}

function scheduleReview(previous, rating) {
  const repetitions = rating < 2 ? 0 : previous.repetitions + 1;
  const easeFactor = Math.max(
    1.3,
    previous.ease_factor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02)),
  );
  let intervalDays = 1;
  if (rating < 2) intervalDays = 0.15;
  else if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 4;
  else intervalDays = Math.max(1, previous.interval_days * easeFactor);
  return { repetitions, easeFactor, intervalDays };
}

export async function recordReview(
  userId,
  nodeId,
  { mode, rating, answer, errorTags = [] },
) {
  if (!weights[mode] || !Number.isInteger(rating) || rating < 0 || rating > 3) {
    throw new Error("Некорректный режим или оценка повторения");
  }
  return transaction(async (client) => {
    await client.query(
      `INSERT INTO knowledge(user_id,node_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
      [userId, nodeId],
    );
    const currentResult = await client.query(
      `SELECT * FROM knowledge WHERE user_id=$1 AND node_id=$2 FOR UPDATE`,
      [userId, nodeId],
    );
    const current = currentResult.rows[0];
    const { field, modeScore, aggregate } = calculateReviewScores(
      current,
      mode,
      rating,
    );
    const schedule = scheduleReview(current, rating);
    const updated = await client.query(
      `UPDATE knowledge SET
         ${field}=$3, aggregate_score=$4, status=$5, seen_count=seen_count+1,
         correct_count=correct_count + CASE WHEN $6 >= 2 THEN 1 ELSE 0 END,
         error_count=error_count + CASE WHEN $6 < 2 THEN 1 ELSE 0 END,
         last_seen_at=now(), next_review_at=now() + ($7::double precision * interval '1 day'),
         interval_days=$7::real, ease_factor=$8, repetitions=$9, updated_at=now()
       WHERE user_id=$1 AND node_id=$2 RETURNING *`,
      [
        userId,
        nodeId,
        modeScore,
        aggregate,
        statusFromScore(aggregate),
        rating,
        schedule.intervalDays,
        schedule.easeFactor,
        schedule.repetitions,
      ],
    );
    await client.query(
      `INSERT INTO review_events(user_id,node_id,mode,rating,answer,error_tags,score_before,score_after)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [
        userId,
        nodeId,
        mode,
        rating,
        answer || null,
        JSON.stringify(errorTags),
        current.aggregate_score,
        aggregate,
      ],
    );
    return updated.rows[0];
  });
}

export async function getDueReviews(userId, limit = 20) {
  const result = await transaction((client) =>
    client.query(
      `SELECT n.id,n.label,n.type,n.cefr,n.translation_ru AS "translationRu",n.examples,n.collocations,
            k.recognition_score AS "recognitionScore",k.recall_score AS "recallScore",
            k.context_score AS "contextScore",k.production_score AS "productionScore",
            k.aggregate_score AS "knowledgeScore",k.status,k.next_review_at AS "nextReviewAt"
     FROM knowledge k JOIN nodes n ON n.id=k.node_id AND n.user_id=k.user_id
     WHERE k.user_id=$1 AND k.next_review_at<=now()
     ORDER BY k.next_review_at, k.aggregate_score
     LIMIT $2`,
      [userId, Math.min(Number(limit) || 20, 50)],
    ),
  );
  return result.rows;
}
