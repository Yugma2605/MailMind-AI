import express, { Request, Response } from "express";
import dotenv from "dotenv";
import categoriesRouter from "./routes/categories.js";
import usersRouter from "./routes/users.js";
import emailsRouter from "./routes/emails.js";
import cors, { CorsOptionsDelegate } from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins: string[] = [
  "https://mail-mind-ai-frontend.vercel.app",
  "http://localhost:8081",
];

// Add frontend URL from env (Render deploys)
console.log(process.env.FRONTEND_URL);
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);


app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/categories", categoriesRouter);
app.use("/users", usersRouter);
app.use("/emails", emailsRouter);

app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
