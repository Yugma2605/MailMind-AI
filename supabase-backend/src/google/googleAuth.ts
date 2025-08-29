// utils/googleAuth.ts
import { google } from "googleapis";
import { supabase } from "../supabase/config.js";
import { decrypt } from "../utils/crypto.js";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI!;

export async function getGoogleAuth(user_id: string) {
  // Fetch stored credentials
  const { data, error } = await supabase
    .from("google_credentials")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (error || !data) throw new Error("No Google credentials found");

  // Build OAuth2 client
  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    OAUTH_REDIRECT_URI
  );

  client.setCredentials({
    access_token: data.access_token,
    refresh_token: decrypt(data.refresh_token_encrypted),
    expiry_date: data.expiry_date ? new Date(data.expiry_date).getTime() : undefined,
  });

  // Refresh if expired
  if (!data.access_token || !data.expiry_date || new Date(data.expiry_date) < new Date()) {
    const { credentials } = await client.refreshAccessToken();
    await supabase
      .from("google_credentials")
      .update({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      })
      .eq("user_id", user_id);
  }

  return client;
}
