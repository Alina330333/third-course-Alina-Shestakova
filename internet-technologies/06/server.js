const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для чтения JSON из тела запроса
app.use(express.json());

// Подключение к базе данных (файл создастся автоматически)
const db = new Database('data.db');

// Создание таблицы при запуске, если её ещё нет
db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  )
`).run();


// 1. Получение списка (с фильтрацией через SQL)
app.get('/api/tasks', (req, res) => {
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  // Фильтр по статусу (done=true/false)
  if (req.query.done !== undefined) {
    sql += ' AND done = ?';
    params.push(req.query.done === 'true' ? 1 : 0);
  }

  // Поиск по названию (q=...)
  if (req.query.q) {
    sql += ' AND title LIKE ?';
    params.push(`%${req.query.q}%`);
  }

  sql += ' ORDER BY id';

  const rows = db.prepare(sql).all(...params);
  
  // Преобразуем 1/0 обратно в true/false для красивого JSON
  const tasks = rows.map(task => ({ ...task, done: Boolean(task.done) }));
  res.json(tasks);
});


// 2. Получение одного объекта по ID
app.get('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ ...task, done: Boolean(task.done) });
});


// 3. Создание новой задачи (POST)
app.post('/api/tasks', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const description = String(req.body.description ?? '').trim();

  // Валидация: title обязателен
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  // lastInsertRowid — ID только что созданной записи
  const result = db.prepare(
    'INSERT INTO tasks (title, description, done) VALUES (?, ?, ?)'
  ).run(title, description, 0);

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ ...newTask, done: Boolean(newTask.done) });
});


// 4. Частичное обновление задачи (PATCH)
app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Если поле не передано в запросе — берём старое значение
  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const description = req.body.description === undefined ? current.description : String(req.body.description).trim();
  const done = req.body.done === undefined ? Boolean(current.done) : Boolean(req.body.done);

  if (!title) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, done = ? WHERE id = ?'
  ).run(title, description, done ? 1 : 0, id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ ...updated, done: Boolean(updated.done) });
});


// 5. Удаление задачи (DELETE)
app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  // changes === 0 означает, что записи с таким ID не было
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).end(); // 204 = Успешно, тело ответа не требуется
});


// 6. Обработка неизвестных маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


// 7. Обработка серверных ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});


// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
