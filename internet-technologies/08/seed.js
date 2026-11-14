const Database = require('better-sqlite3');
const db = new Database('data.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  )
`).run();

// Проверяем, сколько уже есть
const count = db.prepare('SELECT COUNT(*) AS c FROM tasks').get().c;
if (count > 0) {
  console.log(`В базе уже есть ${count} задач. Пропускаем генерацию.`);
  process.exit(0);
}

// Создаем 20 тестовых задач
const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
for (let i = 1; i <= 20; i++) {
  const done = i % 3 === 0 ? 1 : 0; // Каждая третья задача выполнена
  insert.run(`Тестовая задача №${i}`, done);
}

console.log('Успешно добавлено 20 задач!');