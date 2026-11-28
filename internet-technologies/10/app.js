const express = require('express');
const path = require('node:path');
const { isPositiveInteger, parsePositiveInt, parseDone } = require('./validation');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // API задач
  app.get('/api/tasks', (req, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1000000);
    const limit = parsePositiveInt(req.query.limit, 5, 50);
    const done = parseDone(req.query.done);
    const search = req.query.search ?? '';
    const sort = req.query.sort ?? 'id';
    const order = req.query.order ?? 'asc';

    const sortColumns = { id: 'id', title: 'title', done: 'done' };

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
    const total = db.prepare(`SELECT COUNT(*) AS total FROM tasks ${whereSql}`).get(...params).total;
    const offset = (page - 1) * limit;
    const sortSql = sortColumns[sort];
    const orderSql = order.toUpperCase();

    const rows = db.prepare(
      `SELECT * FROM tasks ${whereSql} ORDER BY ${sortSql} ${orderSql}, id ASC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({
      items: rows.map(r => ({ ...r, done: Boolean(r.done) })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

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

  // Транзакции
  const transferTx = db.transaction((fromId, toId, quantity) => {
    const decrease = db.prepare('UPDATE inventories SET quantity = quantity - ? WHERE id = ? AND quantity >= ?').run(quantity, fromId, quantity);
    if (decrease.changes !== 1) throw new Error('SOURCE_UNAVAILABLE');

    const increase = db.prepare('UPDATE inventories SET quantity = quantity + ? WHERE id = ?').run(quantity, toId);
    if (increase.changes !== 1) throw new Error('DESTINATION_NOT_FOUND');

    const log = db.prepare('INSERT INTO transfers (from_id, to_id, quantity) VALUES (?, ?, ?)').run(fromId, toId, quantity);
    return { id: Number(log.lastInsertRowid), fromId, toId, quantity };
  });

  app.get('/api/transfers-data', (req, res) => {
    const inventories = db.prepare('SELECT * FROM inventories ORDER BY id').all();
    const transfers = db.prepare('SELECT * FROM transfers ORDER BY id DESC LIMIT 20').all();
    res.json({ inventories, transfers });
  });

  app.post('/api/transfers', (req, res) => {
    const { fromId, toId, quantity } = req.body ?? {};

    if (!isPositiveInteger(fromId) || !isPositiveInteger(toId) || !isPositiveInteger(quantity) || fromId === toId) {
      return res.status(400).json({ error: 'Некорректные параметры (400)' });
    }

    try {
      const result = transferTx(fromId, toId, quantity);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'SOURCE_UNAVAILABLE') {
        return res.status(409).json({ error: 'Недостаточно остатка на складе (409)' });
      }
      if (error.message === 'DESTINATION_NOT_FOUND') {
        return res.status(404).json({ error: 'Склад-получатель не найден (404)' });
      }
      console.error(error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера (500)' });
    }
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };