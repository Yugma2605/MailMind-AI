import dotenv from "dotenv";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("REDIS URL:", process.env.UPSTASH_REDIS_URL);

const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},
});

await redis.flushdb();
