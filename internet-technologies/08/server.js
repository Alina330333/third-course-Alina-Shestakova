const express = require('express');
const Database = require('better-sqlite3');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('data.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  )
`).run();

// Вспомогательные функции для валидации 
function parsePositiveInt(raw, defaultVal, maxVal) {
  if (raw === undefined) return defaultVal;
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const val = Number(raw);
  if (val > maxVal) return null;
  return val;
}

function parseDone(raw) {
  if (raw === undefined || raw === '') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

// 1. Получение списка (с фильтрацией, сортировкой и пагинацией)
app.get('/api/tasks', (req, res) => {
  const page = parsePositiveInt(req.query.page, 1, 1000000);
  const limit = parsePositiveInt(req.query.limit, 5, 50);
  const done = parseDone(req.query.done);
  const search = req.query.search ?? '';
  const sort = req.query.sort ?? 'id';
  const order = req.query.order ?? 'asc';

  const sortColumns = { id: 'id', title: 'title', done: 'done' };

  // Валидация
  if (page === null || limit === null || done === null ||
      typeof search !== 'string' || search.length > 100 ||
      !Object.hasOwn(sortColumns, sort) ||
      !['asc', 'desc'].includes(order)) {
    return res.status(400).json({ error: 'Некорректные параметры запроса' });
  }

  const where = [];
  const params = [];

  if (search.trim()) {
    where.push('title LIKE ?');
    params.push(`%${search.trim()}%`);
  }
  if (done !== undefined) {
    where.push('done = ?');
    params.push(done ? 1 : 0);
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  
  // Считаем общее количество
  const total = db.prepare(`SELECT COUNT(*) AS total FROM tasks ${whereSql}`).get(...params).total;
  
  const offset = (page - 1) * limit;
  const sortSql = sortColumns[sort];
  const orderSql = order.toUpperCase();

  // Получаем записи
  const rows = db.prepare(
    `SELECT * FROM tasks ${whereSql} ORDER BY ${sortSql} ${orderSql}, id ASC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({
    items: rows.map(r => ({ ...r, done: Boolean(r.done) })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

// Остальные маршруты (GET by ID, POST, PATCH, DELETE) остаются без изменений
app.get('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ ...task, done: Boolean(task.done) });
});

app.post('/api/tasks', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const result = db.prepare('INSERT INTO tasks (title, description, done) VALUES (?, ?, ?)').run(title, String(req.body.description ?? '').trim(), 0);
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...newTask, done: Boolean(newTask.done) });
});

app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Task not found' });

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const done = req.body.done === undefined ? Boolean(current.done) : Boolean(req.body.done);

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(title, done ? 1 : 0, id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ ...updated, done: Boolean(updated.done) });
});

app.delete('/api/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}`));