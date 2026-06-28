import type { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "./auth.js";

export interface AuthRequest extends Request {
  userId?: number;
  user?: { id: number; name: string; email: string; createdAt: Date; updatedAt: Date; passwordHash: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req as any);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = user.id;
  req.user = user;
  next();
}
