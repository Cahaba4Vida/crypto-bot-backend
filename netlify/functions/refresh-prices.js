const { getPositions, setSnapshot, getMeta, setMeta } = require('./_lib/storage');
const { normalizePositions, buildSnapshot } = require('./_lib/compute');
const { fetchLatestPrices, getAlpacaCredentials } = require('./_lib/alpaca');
const { requireAdmin } = require('./_lib/auth');

const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) {
    const error = auth.body?.error || 'unauthorized';
    const code = auth.statusCode === 401 ? 'unauthorized' : 'missing_admin_token';
    console.error('Refresh prices auth failed.', { statusCode: auth.statusCode, error });
    return buildResponse(auth.statusCode, { error, code });
  }

  const { missing } = getAlpacaCredentials();
  if (missing.length) {
    console.error('Missing Alpaca env vars.', { missing });
    return buildResponse(400, { error: 'Missing Alpaca env vars', code: 'missing_alpaca_env', missing });
  }

  try {
    const positions = normalizePositions((await getPositions()) || []);
    const symbols = [...new Set(positions.map((position) => position.symbol))];
    const { prices, asOf } = await fetchLatestPrices(symbols);

    const meta = await getMeta();
    const refreshedMeta = {
      ...(meta || {}),
      lastRefreshAt: asOf || new Date().toISOString(),
      lastError: null,
    };
    const snapshot = buildSnapshot(positions, prices, refreshedMeta);

    await setSnapshot(snapshot);
    await setMeta(refreshedMeta);

    return buildResponse(200, { prices, asOf: refreshedMeta.lastRefreshAt });
  } catch (error) {
    if (error?.missing) {
      console.error('Missing database env vars.', { missing: error.missing });
      return buildResponse(400, {
        error: 'Missing database env var',
        code: 'missing_db_env',
        missing: error.missing,
      });
    }
    const message = error instanceof Error ? error.message : 'Unable to refresh prices.';
    console.error('Refresh prices failed.', error);
    const meta = await getMeta();
    await setMeta({ ...(meta || {}), lastError: message });
    return buildResponse(500, { error: message, code: 'refresh_failed' });
  }
};
