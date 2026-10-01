const pool = require("./db");

async function ensureSchema(db = pool) {
  const { rows } = await db.query(
    "SELECT to_regclass('public.users') AS users_table",
  );
  if (!rows[0].users_table) return false;

  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      module VARCHAR(50) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      section VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  return true;
}

module.exports = { ensureSchema };
