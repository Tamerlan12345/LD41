const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { query, initDatabase } = require('./db');
const { startPriorityService } = require('./services/priorityCic');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || process.env.APP_PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function onServerStart() {
  await initDatabase();
  startPriorityService();
}

// --- API Роуты ---

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
  const { title, deadline, is_important, is_urgent, user_id } = req.body;

  if (!title || !deadline || user_id === undefined) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }

  try {
    const result = await query(
      'INSERT INTO tasks (user_id, title, deadline, is_important, is_urgent, is_completed) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *',
      [user_id, title, deadline, is_important, is_urgent]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

// Получение задач (только активные)
app.get('/api/tasks', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Требуется ID пользователя' });

    try {
        // Возвращаем только не выполненные задачи для матрицы
        const result = await query(
            'SELECT * FROM tasks WHERE user_id = $1 AND is_completed = FALSE ORDER BY deadline ASC',
            [user_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Ошибка получения задач' });
    }
});

// Удаление задачи
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// Завершение задачи (Архивация)
app.patch('/api/tasks/:id/complete', async (req, res) => {
    const { id } = req.params;
    try {
        await query('UPDATE tasks SET is_completed = TRUE WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Complete task error:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  onServerStart();
});
