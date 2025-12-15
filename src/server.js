const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { query, initDatabase } = require('./db');
const { startPriorityService } = require('./services/priorityCic');

require('dotenv').config();

const app = express();
// Порт берется из окружения Railway или 3000
const PORT = process.env.PORT || process.env.APP_PORT || 3000;

app.use(express.json());
// Раздаем статику из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для старта БД и сервисов
async function onServerStart() {
  await initDatabase();
  startPriorityService();
}

// --- API Роуты ---

// Регистрация (Оставим для расширения, но основной вход через Veronika)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Требуется имя пользователя и пароль' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Пользователь уже существует' });
    }
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Логин
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Неверные учетные данные' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Неверные учетные данные' });

        res.json({ id: user.id, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// Создание задачи
app.post('/api/tasks', async (req, res) => {
  const { title, deadline, selected_quadrant, user_id } = req.body;

  if (!title || !deadline || !selected_quadrant || !user_id) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  let is_important = false;
  let is_urgent = false;

  const quadrant = parseInt(selected_quadrant);
  if (quadrant === 1) { is_important = true; is_urgent = true; }
  else if (quadrant === 2) { is_important = true; is_urgent = false; }
  else if (quadrant === 3) { is_important = false; is_urgent = true; }
  else if (quadrant === 4) { is_important = false; is_urgent = false; }

  try {
    const result = await query(
      'INSERT INTO tasks (user_id, title, deadline, is_important, is_urgent) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, title, deadline, is_important, is_urgent]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

// Получение задач
app.get('/api/tasks', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Требуется ID пользователя' });

    try {
        const result = await query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY deadline ASC', [user_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Ошибка получения задач' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  onServerStart();
});
