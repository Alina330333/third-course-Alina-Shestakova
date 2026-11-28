const { createApp } = require('./app');
const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database('data.db');
db.pragma('foreign_keys = ON');

// Инициализация рабочей базы
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS inventories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL CHECK(quantity >= 0)
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL,
    to_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_id) REFERENCES inventories(id),
    FOREIGN KEY (to_id) REFERENCES inventories(id),
    CHECK(from_id <> to_id)
  );
`);

if (db.prepare('SELECT COUNT(*) AS c FROM inventories').get().c === 0) {
  db.prepare('INSERT INTO inventories (id, name, quantity) VALUES (?, ?, ?)').run(1, 'Склад А', 10);
  db.prepare('INSERT INTO inventories (id, name, quantity) VALUES (?, ?, ?)').run(2, 'Склад Б', 5);
}

const app = createApp(db);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}`));