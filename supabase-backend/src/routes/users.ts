import { getGoogleAuth } from "../google/googleAuth.js";
import { google } from "googleapis";
import { Router, Request, Response } from 'express';
import { requireAuth, setSessionCookie, signSessionJWT } from "../utils/auth.js";
import { oauth2Client } from "../google/googleClient.js";
import { supabase } from "../supabase/config.js";
import { encrypt } from "../utils/crypto.js";

const GMAIL_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
];
const router = Router();
router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "select_account",
      scope: GMAIL_SCOPES,
    });
    res.redirect(url); // user goes to Google login
  });

router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) return res.status(400).send("Missing code");

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Verify ID token to get user profile
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).send("Invalid Google payload");

    // Store user in Supabase
    const { data: user, error } = await supabase
        .from("users")
        .upsert({
          google_user_id: payload.sub,
          email: payload.email,
          name: payload.name,
          avatar_url: payload.picture,
        }, { onConflict: 'google_user_id' })
        .select("*")
        .single();

    if (error) throw error;

    // Store credentials
    await supabase.from("google_credentials").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : null,
      expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });

    // Create your app session (JWT or cookie)
    const session = signSessionJWT({ user_id: user.id });
    console.log(session);
    setSessionCookie(res, session);

    // Redirect to frontend (or API response)
    res.redirect("http://localhost:8081/welcome"); // adjust to your frontend
  } catch (err: any) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

router.get("/me", requireAuth(), async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user_id;

    // Fetch user data from Supabase
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, created_at")
      .eq("id", user_id)
      .single();

    if (error) {
      console.error("Supabase error fetching user:", error.message);
      return res.status(500).json({ error: "Failed to fetch user data" });
    }

    if (!data) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(data);
  } catch (err: any) {
    console.error("Unexpected error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;