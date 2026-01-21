const pg = require('pg');

let pool;

const resolveDatabaseUrl = () =>
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';

const getPool = () => {
  if (!pool) {
    const connectionString = resolveDatabaseUrl();
    if (!connectionString) {
      const error = new Error('Missing database env var');
      error.missing = ['DATABASE_URL or NETLIFY_DATABASE_URL'];
      throw error;
    }
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
};

const ensureSettingsTable = async () => {
  const client = getPool();
  await client.query(
    'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL)'
  );
};

module.exports = {
  getPool,
  ensureSettingsTable,
};
