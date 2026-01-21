const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

exports.handler = async () => {
  const hasDb = Boolean(
    process.env.DATABASE_URL ||
      process.env.NETLIFY_DATABASE_URL ||
      process.env.NETLIFY_DATABASE_URL_UNPOOLED
  );

  return buildResponse(200, {
    ok: true,
    hasDb,
    hasAlpacaKey: Boolean(process.env.ALPACA_API_KEY || process.env.ALPACA_KEY_ID),
    hasAlpacaSecret: Boolean(process.env.ALPACA_API_SECRET || process.env.ALPACA_SECRET_KEY),
    hasAdminToken: Boolean(process.env.ADMIN_TOKEN),
  });
};
