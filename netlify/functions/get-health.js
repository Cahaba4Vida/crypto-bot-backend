const { query } = require('./_lib/db');

const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

exports.handler = async () => {
  try {
    const { rows } = await query('SELECT NOW() as now');
    return buildResponse(200, { status: 'ok', now: rows[0]?.now ?? null });
  } catch (error) {
    return buildResponse(500, { status: 'error', message: error.message });
  }
};
