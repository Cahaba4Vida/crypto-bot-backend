import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const headerToken = req.headers["x-admin-token"];
  const headerValue = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const bearer = (req.headers.authorization || "").replace("Bearer ", "");
  const token = headerValue || bearer;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}
