const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для чтения JSON из тела запроса
app.use(express.json());

// Исходные данные (массив в памяти)
const books = [
  { id: 1, title: 'Война и мир', author: 'Лев Толстой', year: 1869, available: true },
  { id: 2, title: 'Преступление и наказание', author: 'Фёдор Достоевский', year: 1866, available: false },
  { id: 3, title: 'Мастер и Маргарита', author: 'Михаил Булгаков', year: 1967, available: true },
  { id: 4, title: '1984', author: 'Джордж Оруэлл', year: 1949, available: false },
  { id: 5, title: 'Гарри Поттер', author: 'Джоан Роулинг', year: 1997, available: true },
  { id: 6, title: 'Хоббит', author: 'Джон Толкин', year: 1937, available: true }
];

// 1. Служебный маршрут /api/info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Books API',
    version: 1,
    items: books.length
  });
});

// 2. Получение коллекции с фильтрацией (Query parameters)
app.get('/api/books', (req, res) => {
  let result = books;

  // Фильтр по автору
  if (req.query.author) {
    result = result.filter(b => b.author.toLowerCase().includes(req.query.author.toLowerCase()));
  }

  // Фильтр по доступности (available=true/false)
  if (req.query.available !== undefined) {
    const expected = req.query.available === 'true';
    result = result.filter(b => b.available === expected);
  }

  // Если есть параметр q (поиск по названию)
  if (req.query.q) {
    result = result.filter(b => b.title.toLowerCase().includes(req.query.q.toLowerCase()));
  }

  res.json(result);
});

// 3. Получение одного объекта по ID (Path parameters)
app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(book);
});

// 4. Создание новой книги (POST)
app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body;

  // Валидация (проверка обязательных полей)
  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }

  const newBook = {
    id: Date.now(), // простой генератор уникального ID
    title: String(title).trim(),
    author: String(author).trim(),
    year: year ? Number(year) : null,
    available: true // по умолчанию новая книга доступна
  };

  books.push(newBook);

  // Возвращаем созданный объект со статусом 201
  res.status(201).json(newBook);
});

// 5. Обработка несуществующих маршрутов (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}/api/info`);
});
