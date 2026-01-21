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

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) {
    return buildResponse(auth.statusCode, auth.body);
  }

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

    const positions = normalizePositions(payload);
    await setPositions(positions);
    const meta = await getMeta();
    const snapshot = buildSnapshot(positions, {}, meta || {});
    await setSnapshot(snapshot);

    return buildResponse(200, { positions, snapshot });
  } catch (error) {
    if (error?.missing) {
      return buildResponse(500, { error: 'Missing database env var', missing: error.missing });
    }
    console.error('Failed to save positions.', error);
    return buildResponse(500, { error: 'Unable to save positions.' });
  }
};
