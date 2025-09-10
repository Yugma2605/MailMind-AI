// src/workers/emailWorker.ts
import { Worker, Queue } from "bullmq";
import { redis } from "../redis/redis.js";
import { supabase } from "../supabase/config.js";
import { getGoogleAuth } from "../google/googleAuth.js";
import { google } from "googleapis";
import classifyEmail from "../utils/classifyEmail.js";

const emailQueue = new Queue("emailQueue", { connection: redis });

new Worker(
  "emailQueue",
  async (job: any) => {
    console.log("📩 Processing email job:", job.id);
    const { userId, gmailId } = job.data;
    
    const auth = await getGoogleAuth(userId);
    const gmail = google.gmail({ version: "v1", auth });

    const msgDetail = await gmail.users.messages.get({
      userId: "me",
      id: gmailId,
      format: "full",
    });

    const headers = msgDetail.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const snippet = msgDetail.data.snippet || "";

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("name, description")
      .eq("user_id", userId);

    const classification = await classifyEmail(
      subject,
      from,
      categoriesData || [],
      snippet
    );

    await supabase.from("emails").insert({
      user_id: userId,
      gmail_id: gmailId,
      subject,
      sender: from,
      snippet,
      classification: JSON.stringify(classification),
    });

    const backlog = await emailQueue.getWaitingCount();
    console.log(`✅ Processed email ${gmailId} for user ${userId}. Remaining backlog: ${backlog}`);
  },
  {
    connection: redis,
    concurrency: 1,
    limiter: { max: 1, duration: 1000 },
  }
);

console.log("🚀 Email worker started");
