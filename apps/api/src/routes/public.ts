import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool.js";

export const publicRouter = Router();

publicRouter.get("/status", (_req: Request, res: Response) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

publicRouter.get("/settings", async (_req: Request, res: Response) => {
  const { rows } = await pool.query("SELECT key, value FROM settings");
  res.json(Object.fromEntries(rows.map((r: any) => [r.key, r.value])));
});
