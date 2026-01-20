const { Pool } = require('pg');

let pool;

const getPool = () => {
  if (!pool) {
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Database connection string is not configured. Set NETLIFY_DATABASE_URL or DATABASE_URL.');
    }

    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
};

const query = async (text, params) => {
  const client = getPool();
  return client.query(text, params);
};

module.exports = {
  query,
};
