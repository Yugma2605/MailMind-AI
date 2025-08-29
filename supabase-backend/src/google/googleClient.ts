// googleClient.ts
import { google } from "googleapis";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/users/google/callback";

export const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  OAUTH_REDIRECT_URI
);
