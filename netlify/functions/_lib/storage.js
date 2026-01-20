const { query } = require('./db');

let schemaReady = false;

const ensureSchema = async () => {
  if (schemaReady) {
    return;
  }

  await query('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB)');
  schemaReady = true;
};

const getSetting = async (key, fallback) => {
  await ensureSchema();
  const { rows } = await query('SELECT value FROM settings WHERE key = $1', [key]);
  if (!rows.length || rows[0].value === null) {
    return fallback;
  }
  return rows[0].value;
};

const setSetting = async (key, value) => {
  await ensureSchema();
  await query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
};

const getPositions = async () => getSetting('positions', []);
const setPositions = async (positions) => setSetting('positions', positions);

const getSnapshot = async () => getSetting('snapshot', null);
const setSnapshot = async (snapshot) => setSetting('snapshot', snapshot);

const getMeta = async () => getSetting('meta', { lastRefreshAt: null, lastError: null });
const setMeta = async (meta) => setSetting('meta', meta);

module.exports = {
  getPositions,
  setPositions,
  getSnapshot,
  setSnapshot,
  getMeta,
  setMeta,
};
