const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../app');
const { createDb } = require('../db-test');

// Вспомогательная функция для запуска сервера
async function startServer(t) {
  const db = createDb();
  const server = createApp(db).listen(0);
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;

  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    db.close();
  });

  return { db, base };
}

// 1. GET списка задач
test('GET /api/tasks возвращает список', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO tasks (title, done) VALUES ('Задача 1', 0), ('Задача 2', 1)").run();

  const res = await fetch(base + '/api/tasks');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.items.length, 2);
  assert.equal(data.pagination.total, 2);
});

// 2. GET несуществующей записи → 404
test('GET /api/tasks/:id возвращает 404 для несуществующей', async (t) => {
  const { base } = await startServer(t);
  const res = await fetch(base + '/api/tasks/999');
  assert.equal(res.status, 404);
});

// 3. Успешный POST
test('POST /api/tasks создает задачу', async (t) => {
  const { db, base } = await startServer(t);
  const res = await fetch(base + '/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Новая задача' })
  });
  assert.equal(res.status, 201);
  const task = await res.json();
  assert.equal(task.title, 'Новая задача');
  assert.equal(task.done, false);

  const dbTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id);
  assert.ok(dbTask);
});

// 4. Невалидный POST → 400
test('POST /api/tasks возвращает 400 при пустом title', async (t) => {
  const { base } = await startServer(t);
  const res = await fetch(base + '/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '' })
  });
  assert.equal(res.status, 400);
});

// 5. Успешный PATCH
test('PATCH /api/tasks/:id обновляет задачу', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO tasks (id, title, done) VALUES (1, 'Старая', 0)").run();

  const res = await fetch(base + '/api/tasks/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: true })
  });
  assert.equal(res.status, 200);
  const updated = await res.json();
  assert.equal(updated.done, true);
});

// 6. Успешный DELETE → 204
test('DELETE /api/tasks/:id удаляет задачу', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO tasks (id, title) VALUES (1, 'Удаляемая')").run();

  const res = await fetch(base + '/api/tasks/1', { method: 'DELETE' });
  assert.equal(res.status, 204);

  const dbTask = db.prepare('SELECT * FROM tasks WHERE id = 1').get();
  assert.equal(dbTask, undefined);
});

// 7. Фильтрация
test('GET /api/tasks?done=true фильтрует задачи', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO tasks (title, done) VALUES ('Выполнено', 1), ('Не выполнено', 0)").run();

  const res = await fetch(base + '/api/tasks?done=true');
  const data = await res.json();
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].title, 'Выполнено');
});

// 8. Сортировка
test('GET /api/tasks?sort=title&order=desc сортирует', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO tasks (title) VALUES ('Б'), ('А'), ('В')").run();

  const res = await fetch(base + '/api/tasks?sort=title&order=desc');
  const data = await res.json();
  assert.equal(data.items[0].title, 'В');
  assert.equal(data.items[2].title, 'А');
});

// 9. Пагинация
test('GET /api/tasks?page=2&limit=3 возвращает правильную страницу', async (t) => {
  const { db, base } = await startServer(t);
  for (let i = 1; i <= 7; i++) db.prepare("INSERT INTO tasks (title) VALUES (?)").run('Task ' + i);

  const res = await fetch(base + '/api/tasks?page=2&limit=3');
  const data = await res.json();
  
  // На второй странице должно быть 3 элемента (задачи 4, 5, 6)
  assert.equal(data.items.length, 3); 
  assert.equal(data.pagination.total, 7);
  assert.equal(data.pagination.pages, 3); // 7 задач / 3 = 2.33 -> 3 страницы
});

// 10. Невалидный query-параметр → 400
test('GET /api/tasks?limit=99999 возвращает 400', async (t) => {
  const { base } = await startServer(t);
  const res = await fetch(base + '/api/tasks?limit=99999');
  assert.equal(res.status, 400);
});

// 11. Успешная транзакция с проверкой реальных данных
test('POST /api/transfers успешно переводит средства', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO inventories (id, name, quantity) VALUES (1, 'A', 10), (2, 'B', 5)").run();

  const res = await fetch(base + '/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromId: 1, toId: 2, quantity: 3 })
  });
  assert.equal(res.status, 201);

  const a = db.prepare('SELECT quantity FROM inventories WHERE id = 1').get();
  const b = db.prepare('SELECT quantity FROM inventories WHERE id = 2').get();
  assert.equal(a.quantity, 7);
  assert.equal(b.quantity, 8);
});

// 12. Сбой внутри транзакции и полный rollback
test('POST /api/transfers откатывает изменения при нехватке средств', async (t) => {
  const { db, base } = await startServer(t);
  db.prepare("INSERT INTO inventories (id, name, quantity) VALUES (1, 'A', 10), (2, 'B', 5)").run();

  const res = await fetch(base + '/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromId: 1, toId: 2, quantity: 99 })
  });
  assert.equal(res.status, 409);

  const a = db.prepare('SELECT quantity FROM inventories WHERE id = 1').get();
  const b = db.prepare('SELECT quantity FROM inventories WHERE id = 2').get();
  assert.equal(a.quantity, 10);
  assert.equal(b.quantity, 5);
  
  const history = db.prepare('SELECT COUNT(*) as c FROM transfers').get();
  assert.equal(history.c, 0);
});