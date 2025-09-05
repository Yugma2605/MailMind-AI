import { Worker } from "bullmq";
import { supabase } from "../supabase/config.js";
import { getGoogleAuth } from "../google/googleAuth.js";
import { google } from "googleapis";
import { redis } from "../redis/redis.js";
import classifyEmail from "../utils/classifyEmail.js";

export const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    const { userId, gmailId } = job.data;
    console.log("📩 Processing email job:", job.id, "for user:", userId);

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

    console.log(`✅ Processed email ${gmailId} for user ${userId}`);
  },
  {
    connection: redis,
    concurrency: 1, // only 1 job at a time
    limiter: {
      max: 1, // max 1 job
      duration: 1000, // per 1000 ms = 1 job/sec
    },
  }
);
