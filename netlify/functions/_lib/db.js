const pg = require('pg');

let pool;

const getPool = () => {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
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
