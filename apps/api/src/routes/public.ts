import { Router } from "express";
import { pool } from "../db/pool.js";
export const publicRouter = Router();
publicRouter.get("/status", (_req, res) => res.json({ ok: true }));
