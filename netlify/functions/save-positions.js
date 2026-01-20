const { setPositions, setSnapshot, getMeta } = require('./_lib/storage');
const { normalizePositions, buildSnapshot } = require('./_lib/compute');

const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const incoming = JSON.parse(event.body || '[]');
    const positions = normalizePositions(incoming);
    await setPositions(positions);
    const meta = await getMeta();
    const snapshot = buildSnapshot(positions, {}, meta);
    await setSnapshot(snapshot);

    return buildResponse(200, { positions, snapshot });
  } catch (error) {
    return buildResponse(500, { error: error.message });
  }
};
