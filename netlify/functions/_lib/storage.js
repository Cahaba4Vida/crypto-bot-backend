const { getStore } = require('@netlify/blobs');

const store = getStore('portfolio-dashboard');

const readJson = async (key, fallback) => {
  const value = await store.get(key, { type: 'json' });
  return value ?? fallback;
};

const writeJson = async (key, value) => {
  await store.set(key, JSON.stringify(value), { metadata: { updatedAt: new Date().toISOString() } });
};

const getPositions = async () => readJson('positions.json', []);
const setPositions = async (positions) => writeJson('positions.json', positions);

const getSnapshot = async () => readJson('snapshot.json', null);
const setSnapshot = async (snapshot) => writeJson('snapshot.json', snapshot);

const getMeta = async () => readJson('meta.json', { lastRefreshAt: null, lastError: null });
const setMeta = async (meta) => writeJson('meta.json', meta);

module.exports = {
  getPositions,
  setPositions,
  getSnapshot,
  setSnapshot,
  getMeta,
  setMeta,
};
