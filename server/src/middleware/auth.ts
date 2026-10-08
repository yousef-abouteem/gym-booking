import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role = "member" | "gym_owner";

// نضيف خاصية user إلى كل طلب حتى يعرفها TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    req.user = { id: payload.sub as string, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}