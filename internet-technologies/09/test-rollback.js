const Database = require('better-sqlite3');
const db = new Database('data.db');
db.pragma('foreign_keys = ON');

console.log('ДО ТЕСТА СБОЯ');
console.log(db.prepare('SELECT * FROM inventories').all());

const demoTx = db.transaction(() => {
  db.prepare('UPDATE inventories SET quantity = quantity - 2 WHERE id = 1').run();
  throw new Error('Искусственный сбой после первого UPDATE');
});

try {
  demoTx();
} catch (e) {
  console.log('\nПРОИЗОШЕЛ СБОЙ:', e.message);
}

console.log('\nПОСЛЕ СБОЯ (данные должны быть нетронуты)');
console.log(db.prepare('SELECT * FROM inventories').all());