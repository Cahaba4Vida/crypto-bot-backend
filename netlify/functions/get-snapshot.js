const { getSnapshot } = require('./_lib/storage');

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
    const snapshot = await getSnapshot();
    return buildResponse(200, snapshot || {});
  } catch (error) {
    return buildResponse(500, { error: error.message });
  }
};
