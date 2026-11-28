const Database = require('better-sqlite3');

function createDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  
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
  
  return db;
}

module.exports = { createDb };