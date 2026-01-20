import { pool } from "./pool.js";

export async function getSetting<T>(key: string): Promise<T | null> {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);
  if (!rows.length) {
    return null;
  }
  return rows[0].value as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await pool.query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, value]
  );
}
