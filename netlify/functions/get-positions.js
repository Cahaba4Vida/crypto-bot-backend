const { getPositions } = require('./_lib/storage');
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
    const positions = (await getPositions()) || [];
    return buildResponse(200, { positions });
  } catch (error) {
    if (error?.missing) {
      return buildResponse(500, { error: 'Missing database env var', missing: error.missing });
    }
    console.error('Failed to load positions.', error);
    return buildResponse(500, { error: 'Unable to load positions.' });
  }
};
