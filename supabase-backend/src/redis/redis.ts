import { Redis } from "ioredis";

export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck: false,
  tls: {}, // Upstash requires TLS
});
