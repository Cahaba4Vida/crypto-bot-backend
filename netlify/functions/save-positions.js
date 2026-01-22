const { setPositions, setSnapshot, getMeta } = require('./_lib/storage');
const { normalizePositions, buildSnapshot } = require('./_lib/compute');
const { requireAdmin } = require('./_lib/auth');

const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

const validatePositions = (positions) => {
  const invalidIndexes = [];
  positions.forEach((position, index) => {
    if (!position || typeof position !== 'object') {
      invalidIndexes.push(index);
      return;
    }
    const symbolOk = typeof position.symbol === 'string' && position.symbol.trim().length > 0;
    const sharesOk =
      typeof position.shares === 'number' && Number.isFinite(position.shares) && position.shares > 0;
    const avgCostOk =
      position.avgCost === null ||
      (typeof position.avgCost === 'number' && Number.isFinite(position.avgCost));
    if (!symbolOk || !sharesOk || !avgCostOk) {
      invalidIndexes.push(index);
    }
  });
  return invalidIndexes;
};

const summarizePositions = (positions) => ({
  count: Array.isArray(positions) ? positions.length : 0,
  symbols: Array.isArray(positions)
    ? [...new Set(positions.map((position) => position.symbol).filter(Boolean))].slice(0, 10)
    : [],
});

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) {
    return buildResponse(auth.statusCode, auth.body);
  }

  let positions = null;
  let positionsSummary = null;

  try {
    let incoming = null;
    try {
      incoming = JSON.parse(event.body || 'null');
    } catch (parseError) {
      return buildResponse(400, {
        error: 'Invalid JSON payload.',
        receivedType: 'invalid_json',
        receivedKeys: [],
      });
    }

    const payload = Array.isArray(incoming) ? incoming : incoming?.positions;
    if (!Array.isArray(payload)) {
      const receivedType =
        incoming === null ? 'null' : Array.isArray(incoming) ? 'array' : typeof incoming;
      const receivedKeys =
        incoming && typeof incoming === 'object' ? Object.keys(incoming) : [];
      return buildResponse(400, {
        error: 'Positions payload must be an array.',
        receivedType,
        receivedKeys,
      });
    }

    const invalidIndexes = validatePositions(payload);
    if (invalidIndexes.length > 0) {
      return buildResponse(400, {
        error: 'Each position must include a symbol, shares, and avgCost.',
        invalidCount: invalidIndexes.length,
      });
    }

    positions = normalizePositions(payload);
    positionsSummary = summarizePositions(positions);
    await setPositions(positions);
    const meta = await getMeta();
    const snapshot = buildSnapshot(positions, {}, meta || {});
    await setSnapshot(snapshot);

    return buildResponse(200, { positions, snapshot });
  } catch (error) {
    if (error?.missing) {
      return buildResponse(500, { error: 'Missing database env var', missing: error.missing });
    }
    console.error('Failed to save positions.', {
      code: error?.code,
      message: error?.message,
      storedType: typeof positions,
      storedIsArray: Array.isArray(positions),
      storedSummary: positionsSummary || summarizePositions(positions),
    });
    return buildResponse(500, { error: 'Unable to save positions.' });
  }
};
