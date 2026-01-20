const { getPool, ensureSettingsTable } = require('./db');

const getSetting = async (key) => {
  const pool = getPool();
  await ensureSettingsTable();
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  if (!rows.length) {
    return null;
  }
  return rows[0].value;
};

const setSetting = async (key, value) => {
  const pool = getPool();
  await ensureSettingsTable();
  await pool.query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
};

const getPositions = async () => getSetting('positions');
const setPositions = async (positions) => setSetting('positions', positions);
const getSnapshot = async () => getSetting('snapshot');
const setSnapshot = async (snapshot) => setSetting('snapshot', snapshot);
const getMeta = async () => getSetting('meta');
const setMeta = async (meta) => setSetting('meta', meta);

module.exports = {
  getSetting,
  setSetting,
  getPositions,
  setPositions,
  getSnapshot,
  setSnapshot,
  getMeta,
  setMeta,
};
