const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool, initDatabase } = require('./db');
const { startPriorityService } = require('./services/priorityCic');

require('dotenv').config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to start DB and CIC on server start
async function onServerStart() {
  await initDatabase();
  startPriorityService();
}

// API Routes

// Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login (Simple implementation for demo purposes to get user ID)
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Create Task
app.post('/api/tasks', async (req, res) => {
  const { title, deadline, selected_quadrant, user_id } = req.body;

  if (!title || !deadline || !selected_quadrant || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let is_important = false;
  let is_urgent = false;

  // Mapping Logic
  // 1: Important & Urgent
  // 2: Important & Not Urgent
  // 3: Not Important & Urgent
  // 4: Not Important & Not Urgent
  const quadrant = parseInt(selected_quadrant);
  if (quadrant === 1) { is_important = true; is_urgent = true; }
  else if (quadrant === 2) { is_important = true; is_urgent = false; }
  else if (quadrant === 3) { is_important = false; is_urgent = true; }
  else if (quadrant === 4) { is_important = false; is_urgent = false; }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, deadline, is_important, is_urgent) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, title, deadline, is_important, is_urgent]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Tasks
app.get('/api/tasks', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID required' });

    try {
        const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY deadline ASC', [user_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  onServerStart();
});
