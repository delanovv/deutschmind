import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "../modules/jobs/redis.js";
import {
  markJobActive,
  markJobCompleted,
  markJobFailed,
} from "../modules/jobs/jobService.js";
import { processExpandNodeJob } from "../modules/ai-generation/expandNodeJob.js";
import { processAnalyzeMaterialJob } from "../modules/materials/analyzeMaterialJob.js";

if (!redis) throw new Error("REDIS_URL обязателен для AI worker");

const handlers = {
  "expand-node": processExpandNodeJob,
  "analyze-material": processAnalyzeMaterialJob,
};

const worker = new Worker(
  "deutschmind-ai",
  async (job) => {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`Неизвестный тип AI-задачи: ${job.name}`);
    await markJobActive(job.data.databaseJobId);
    try {
      const { result, usage } = await handler(job.data);
      await markJobCompleted(job.data.databaseJobId, result, usage);
      return result;
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts || 1))
        await markJobFailed(job.data.databaseJobId, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: Number(process.env.AI_WORKER_CONCURRENCY) || 2,
  },
);

worker.on("failed", (job, error) =>
  console.error("AI job failed", job?.id, error.message),
);
console.log("DeutschMind AI worker is ready");
