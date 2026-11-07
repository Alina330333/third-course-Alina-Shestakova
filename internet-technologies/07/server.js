const express = require('express');
const Database = require('better-sqlite3');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Разрешаем серверу отдавать статические файлы (HTML, CSS, JS) из папки public
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('data.db');

// Создание таблицы при запуске
db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  )
`).run();

// 1. Получение списка
app.get('/api/tasks', (req, res) => {
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (req.query.done !== undefined) {
    sql += ' AND done = ?';
    params.push(req.query.done === 'true' ? 1 : 0);
  }
  if (req.query.q) {
    sql += ' AND title LIKE ?';
    params.push(`%${req.query.q}%`);
  }
  sql += ' ORDER BY id';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(task => ({ ...task, done: Boolean(task.done) })));
});

// 2. Получение одной задачи
app.get('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ ...task, done: Boolean(task.done) });
});

// 3. Создание
app.post('/api/tasks', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const description = String(req.body.description ?? '').trim();

  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare('INSERT INTO tasks (title, description, done) VALUES (?, ?, ?)').run(title, description, 0);
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  
  res.status(201).json({ ...newTask, done: Boolean(newTask.done) });
});

// 4. Изменение
app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Task not found' });

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const description = req.body.description === undefined ? current.description : String(req.body.description).trim();
  const done = req.body.done === undefined ? Boolean(current.done) : Boolean(req.body.done);

  if (!title) return res.status(400).json({ error: 'title cannot be empty' });

  db.prepare('UPDATE tasks SET title = ?, description = ?, done = ? WHERE id = ?').run(title, description, done ? 1 : 0, id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  res.json({ ...updated, done: Boolean(updated.done) });
});

// 5. Удаление
app.delete('/api/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end(); // 204 = Успешно, без тела
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}`));