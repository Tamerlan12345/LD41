const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // Support for DATABASE_URL if present (Railway often provides this)
  connectionString: process.env.DATABASE_URL || undefined,
});

async function initDatabase() {
  console.log('Initializing database...');

  // Create tables if they don't exist
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
    await pool.query(createUsersTableQuery);
    await pool.query(createTasksTableQuery);
    console.log('Tables created or verified.');

    // Seed Admin
    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['admin', hashedPassword]);
      console.log('Admin user seeded.');
    } else {
      console.log('Admin user already exists.');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    // process.exit(1); // Optional: Exit if DB fails
  }
}

module.exports = {
  pool,
  initDatabase
};
