const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dns = require('dns');
const util = require('util');
require('dotenv').config();

// Превращаем dns.lookup в Promise, чтобы использовать await
const lookup = util.promisify(dns.lookup);

let pool; // Объявляем переменную, но не инициализируем её сразу

// Функция для получения конфигурации с принудительным IPv4
async function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;
  let config = {
    connectionString,
    connectionTimeoutMillis: 5000, // Таймаут 5 секунд
  };

  try {
    // Определяем хост: либо из переменной PGHOST, либо парсим из URL
    let hostname = process.env.PGHOST;
    if (!hostname && connectionString) {
      const match = connectionString.match(/@(.*):/);
      if (match) hostname = match[1];
    }

    if (hostname) {
      console.log(`Resolving IP for host: ${hostname}...`);
      // Принудительно запрашиваем IPv4 (family: 4)
      const { address } = await lookup(hostname, { family: 4 });
      console.log(`Resolved to IPv4: ${address}`);

      // Переопределяем хост на полученный IP
      config.host = address;
      // Если используем URL, pg может игнорировать host, поэтому лучше явно передать параметры,
      // но часто override работает. Для надежности можно убрать connectionString если есть host,
      // но оставим так, обычно pg умный.
    }
  } catch (error) {
    console.warn('DNS lookup failed, proceeding with default settings:', error.message);
  }

  return config;
}

async function initDatabase() {
  console.log('Initializing database...');

  // 1. Сначала настраиваем подключение
  if (!pool) {
    const config = await getDatabaseConfig();
    pool = new Pool(config);
  }

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
    // Проверка соединения
    await pool.query('SELECT NOW()');
    console.log('Connected to DB successfully.');

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
  // Экспортируем функцию query, которая ссылается на актуальный pool
  query: (text, params) => {
    if (!pool) throw new Error('Database not initialized yet!');
    return pool.query(text, params);
  },
  // Геттер на случай, если где-то нужен сам объект pool
  getPool: () => pool,
  initDatabase
};
