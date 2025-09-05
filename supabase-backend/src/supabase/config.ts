import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust the path here to wherever your .env really is
const envPath = path.resolve(__dirname, "../../.env");
// console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });
// dotenv.config({ path: envPath });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
export { supabase };
