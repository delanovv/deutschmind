import { Queue } from "bullmq";
import { query } from "../../db/pool.js";
import { redis, redisEnabled } from "./redis.js";

const queue = redisEnabled
  ? new Queue("deutschmind-ai", {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: 500,
        removeOnFail: 1000
      }
    })
  : null;

export async function enqueueAiJob({ userId, type, idempotencyKey, payload }) {
  const inserted = await query(
    `INSERT INTO ai_jobs(user_id,type,idempotency_key,payload,status)
     VALUES($1,$2,$3,$4::jsonb,'queued')
     ON CONFLICT(user_id,idempotency_key) DO UPDATE SET updated_at=ai_jobs.updated_at
     RETURNING *`,
    [userId, type, idempotencyKey, JSON.stringify(payload)]
  );
  const record = inserted.rows[0];
  const reused = new Date(record.updated_at).getTime() < Date.now() - 500;
  if (queue && record.status === "queued") {
    await queue.add(type, { databaseJobId: record.id, userId, payload }, { jobId: record.id });
  }
  return {
    id: record.id,
    status: record.status,
    reused,
    queue: queue ? "redis" : "database-pending"
  };
}

export async function getJobStatus(userId, id) {
  // Repair terminal jobs written by older workers that saved a result/error
  // but left the lifecycle status at "queued".
  await query(
    `UPDATE ai_jobs
     SET status = CASE
       WHEN result IS NOT NULL THEN 'completed'
       WHEN error_message IS NOT NULL THEN 'failed'
       ELSE status
     END,
     updated_at = CASE
       WHEN status IN ('queued', 'active') AND (result IS NOT NULL OR error_message IS NOT NULL)
         THEN now()
       ELSE updated_at
     END
     WHERE id=$1 AND user_id=$2
       AND status IN ('queued', 'active')
       AND (result IS NOT NULL OR error_message IS NOT NULL)`,
    [id, userId]
  );
  const result = await query(
    `SELECT id,type,status,result,error_message AS "errorMessage",attempts,model,
            input_tokens AS "inputTokens",output_tokens AS "outputTokens",
            estimated_cost_usd AS "estimatedCostUsd",created_at AS "createdAt",updated_at AS "updatedAt"
     FROM ai_jobs WHERE id=$1 AND user_id=$2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function markJobActive(id) {
  await query(
    "UPDATE ai_jobs SET status='active', attempts=attempts+1, error_message=NULL, updated_at=now() WHERE id=$1",
    [id]
  );
}

export async function markJobCompleted(id, result, usage = {}) {
  await query(
    `UPDATE ai_jobs SET status='completed',result=$2::jsonb,error_message=NULL,model=$3,input_tokens=$4,output_tokens=$5,
       estimated_cost_usd=$6,updated_at=now() WHERE id=$1`,
    [id, JSON.stringify(result), usage.model || null, usage.inputTokens || null, usage.outputTokens || null, usage.cost || null]
  );
}

export async function markJobFailed(id, error) {
  await query("UPDATE ai_jobs SET status='failed',error_message=$2,updated_at=now() WHERE id=$1", [id, error.message]);
}
