import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"; // put a strong one in .env

// Issue a signed JWT for a user
export function signSessionJWT(payload: { user_id: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" }); // 7-day session
}

// Set cookie with the JWT
export function setSessionCookie(res: Response, token: string) {
  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Middleware to protect routes
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Read from cookie or Authorization header
      const token =
        req.cookies?.session ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);

      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string };
      (req as any).user_id = decoded.user_id; // attach to request

      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
