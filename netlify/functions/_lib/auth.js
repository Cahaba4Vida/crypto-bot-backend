const normalizeToken = (value) => (typeof value === 'string' ? value.trim() : '');

const getProvidedToken = (headers = {}) => {
  const authorization = headers.authorization || headers.Authorization || '';
  return normalizeToken(authorization.replace('Bearer ', ''));
};

const getAdminToken = () => {
  const baseToken = normalizeToken(process.env.ADMIN_TOKEN);
  const context = process.env.DEPLOY_CONTEXT || process.env.CONTEXT || '';
  const normalizedContext = context.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const contextTokenKey = normalizedContext ? `ADMIN_TOKEN_${normalizedContext}` : '';
  const contextToken = normalizeToken(contextTokenKey ? process.env[contextTokenKey] : '');

  return contextToken || baseToken;
};

const requireAdmin = (event) => {
  const adminToken = getAdminToken();
  if (!adminToken) {
    return { ok: false, statusCode: 500, body: { error: 'ADMIN_TOKEN is not configured.' } };
  }
  const providedToken = getProvidedToken(event.headers || {});
  if (!providedToken || providedToken !== adminToken) {
    return { ok: false, statusCode: 401, body: { error: 'unauthorized' } };
  }
  return { ok: true };
};

module.exports = {
  requireAdmin,
};
