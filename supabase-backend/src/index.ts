import express from 'express';
import dotenv from 'dotenv';
import categoriesRouter from './routes/categories.js';
import usersRouter from './routes/users.js';
import emailsRouter from './routes/emails.js';
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
console.log(port);
app.use(
  cors({
    origin: "http://localhost:8081", // your frontend URL
    credentials: true, // allow cookies
  })
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/categories', categoriesRouter);
app.use('/users', usersRouter);
app.use('/emails', emailsRouter);
app.get("/ping", (req, res) => {
  res.send("pong");
});
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
