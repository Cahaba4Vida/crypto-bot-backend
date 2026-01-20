import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getSetting, setSetting } from "../db/settings.js";
import { buildSnapshot, normalizePositions, type PositionInput } from "../lib/compute.js";
import { fetchLatestPrices, getAlpacaCredentials } from "../lib/alpaca.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/positions", async (_req: Request, res: Response) => {
  try {
    const stored = (await getSetting<PositionInput[]>("positions")) ?? [];
    res.json({ positions: stored });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load positions.";
    res.status(500).json({ error: message });
  }
});

adminRouter.post("/positions", async (req: Request, res: Response) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Positions payload must be an array." });
    }
    const positions = normalizePositions(req.body as PositionInput[]);
    await setSetting("positions", positions);

    const meta = (await getSetting<Record<string, string | null>>("meta")) ?? {};
    const snapshot = buildSnapshot(positions, {}, { lastRefreshAt: meta.lastRefreshAt ?? null });
    await setSetting("snapshot", snapshot);

    return res.json({ positions, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save positions.";
    return res.status(500).json({ error: message });
  }
});

adminRouter.get("/snapshot", async (_req: Request, res: Response) => {
  try {
    const snapshot = (await getSetting<Record<string, unknown>>("snapshot")) ?? {};
    res.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load snapshot.";
    res.status(500).json({ error: message });
  }
});

adminRouter.post("/refresh-prices", async (_req: Request, res: Response) => {
  try {
    const { missing } = getAlpacaCredentials();
    if (missing.length) {
      console.error("Missing Alpaca env vars.", { missing });
      return res.status(500).json({ error: "Missing Alpaca env vars", missing });
    }
    const stored = (await getSetting<PositionInput[]>("positions")) ?? [];
    const positions = normalizePositions(stored);
    const symbols = [...new Set(positions.map((position) => position.symbol))];
    const { prices, asOf } = await fetchLatestPrices(symbols);

    const meta = (await getSetting<Record<string, string | null>>("meta")) ?? {};
    const refreshedMeta = {
      ...meta,
      lastRefreshAt: asOf ?? new Date().toISOString(),
      lastError: null,
    };

    const snapshot = buildSnapshot(positions, prices, refreshedMeta);
    await setSetting("snapshot", snapshot);
    await setSetting("meta", refreshedMeta);

    res.json({ prices, asOf: refreshedMeta.lastRefreshAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refresh prices.";
    console.error("Refresh prices failed.", error);
    const meta = (await getSetting<Record<string, string | null>>("meta")) ?? {};
    await setSetting("meta", { ...meta, lastError: message });
    res.status(500).json({ error: message });
  }
});
