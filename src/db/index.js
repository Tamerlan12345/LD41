const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dns = require('dns');
const util = require('util');
require('dotenv').config();

const lookup = util.promisify(dns.lookup);

let pool;

async function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;
  let config = {
    connectionString,
    connectionTimeoutMillis: 5000,
  };

  try {
    let hostname = process.env.PGHOST;
    if (!hostname && connectionString) {
      const match = connectionString.match(/@(.*):/);
      if (match) hostname = match[1];
    }

    if (hostname) {
      console.log(`Resolving IP for host: ${hostname}...`);
      const { address } = await lookup(hostname, { family: 4 });
      config.host = address;
    }
  } catch (error) {
    console.warn('DNS lookup failed, proceeding with default settings:', error.message);
  }

  return config;
}

async function initDatabase() {
  console.log('Initializing database...');

  if (!pool) {
    const config = await getDatabaseConfig();
    pool = new Pool(config);
  }

  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTasksTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_important BOOLEAN DEFAULT FALSE,
      is_urgent BOOLEAN DEFAULT FALSE,
      is_completed BOOLEAN DEFAULT FALSE,
      deadline TIMESTAMP,
      quadrant_id INT GENERATED ALWAYS AS (
        CASE
          WHEN is_important = TRUE AND is_urgent = TRUE THEN 1
          WHEN is_important = TRUE AND is_urgent = FALSE THEN 2
          WHEN is_important = FALSE AND is_urgent = TRUE THEN 3
          ELSE 4
        END
      ) STORED
    );
  `;

  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to DB successfully.');

    await pool.query(createUsersTableQuery);
    await pool.query(createTasksTableQuery);
    console.log('Tables created or verified.');

    // --- MIGRATION: Check for is_completed column ---
    const checkColumnQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='tasks' AND column_name='is_completed';
    `;
    const res = await pool.query(checkColumnQuery);
    if (res.rows.length === 0) {
        console.log('Adding is_completed column to tasks table...');
        await pool.query('ALTER TABLE tasks ADD COLUMN is_completed BOOLEAN DEFAULT FALSE');
        console.log('Column is_completed added.');
    }
    // ------------------------------------------------

    // --- Seeding Veronika ---
    const targetUser = 'Veronika';
    const targetPass = '7777777Veronika';

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [targetUser]);

    if (userCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(targetPass, 10);
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [targetUser, hashedPassword]);
      console.log(`User ${targetUser} seeded successfully.`);
    } else {
      console.log(`User ${targetUser} already exists.`);
    }
    // -----------------------------------------

  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = {
  query: (text, params) => {
    if (!pool) throw new Error('Database not initialized yet!');
    return pool.query(text, params);
  },
  getPool: () => pool,
  initDatabase
};
