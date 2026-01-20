const { getSnapshot } = require('./_lib/storage');
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
    const snapshot = await getSnapshot();
    return buildResponse(200, snapshot || {});
  } catch (error) {
    console.error('Failed to load snapshot.', error);
    return buildResponse(500, { error: 'Unable to load snapshot.' });
  }
};
