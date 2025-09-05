import { Queue } from "bullmq";
import { redis } from "../redis/redis.js";
import { emailQueue } from "../queue/emailQueue.js";

async function showBacklog() {
  const waiting = await emailQueue.getWaitingCount();
  const active = await emailQueue.getActiveCount();
  const completed = await emailQueue.getCompletedCount();
  const failed = await emailQueue.getFailedCount();

  console.log({ waiting, active, completed, failed });
}

showBacklog();
