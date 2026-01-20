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
    const incoming = JSON.parse(event.body || '[]');
    if (!Array.isArray(incoming)) {
      return buildResponse(400, { error: 'Positions payload must be an array.' });
    }
    const positions = normalizePositions(incoming);
    await setPositions(positions);
    const meta = await getMeta();
    const snapshot = buildSnapshot(positions, {}, meta || {});
    await setSnapshot(snapshot);

    return buildResponse(200, { positions, snapshot });
  } catch (error) {
    console.error('Failed to save positions.', error);
    return buildResponse(500, { error: 'Unable to save positions.' });
  }
};
