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
  const coercedValue = (() => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  })();
  await pool.query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, coercedValue]
  );
};

const normalizePositionsValue = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (Array.isArray(parsed?.positions)) {
        return parsed.positions;
      }
    } catch (error) {
      return [];
    }
  }
  if (Array.isArray(value?.positions)) {
    return value.positions;
  }
  return [];
};

const getPositions = async () => {
  const value = await getSetting('positions');
  const normalized = normalizePositionsValue(value);
  if (value !== null && !Array.isArray(value)) {
    await setSetting('positions', []);
  }
  return normalized;
};
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
