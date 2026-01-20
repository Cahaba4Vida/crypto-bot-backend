const { getPositions, setSnapshot, getMeta, setMeta } = require('./_lib/storage');
const { normalizePositions, buildSnapshot } = require('./_lib/compute');
const { fetchLatestPrices } = require('./_lib/alpaca');

const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshPrices = async () => {
  const positions = normalizePositions(await getPositions());
  const symbols = [...new Set(positions.map((position) => position.symbol))];
  const priceMap = await fetchLatestPrices(symbols);
  const meta = await getMeta();
  const refreshedMeta = {
    ...meta,
    lastRefreshAt: new Date().toISOString(),
    lastError: null,
  };
  const snapshot = buildSnapshot(positions, priceMap, refreshedMeta);

  await setSnapshot(snapshot);
  await setMeta(refreshedMeta);

  return snapshot;
};

exports.handler = async (event) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return buildResponse(500, { error: 'ADMIN_TOKEN is not configured.' });
  }
  const providedToken = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
  if (providedToken !== adminToken) {
    return buildResponse(401, { error: 'Unauthorized.' });
  }

  try {
    const snapshot = await refreshPrices();
    return buildResponse(200, snapshot);
  } catch (error) {
    const meta = await getMeta();
    await setMeta({
      ...meta,
      lastError: error.message,
    });
    return buildResponse(500, { error: error.message });
  }
};

module.exports = {
  refreshPrices,
};
