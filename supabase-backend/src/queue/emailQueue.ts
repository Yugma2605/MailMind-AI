// queues/emailQueue.ts
import { Queue } from "bullmq";
import { redis } from "../redis/redis.js";

export const emailQueue = new Queue("emailQueue", { connection: redis });
