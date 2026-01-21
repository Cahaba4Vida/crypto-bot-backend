const getProvidedToken = (headers = {}) => {
  const authorization = headers.authorization || headers.Authorization || '';
  return authorization.replace('Bearer ', '');
};

const requireAdmin = (event) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return { ok: false, statusCode: 500, body: { error: 'ADMIN_TOKEN is not configured.' } };
  }
  const providedToken = getProvidedToken(event.headers || {});
  if (providedToken !== adminToken) {
    return { ok: false, statusCode: 401, body: { error: 'unauthorized' } };
  }
  return { ok: true };
};

module.exports = {
  requireAdmin,
};
