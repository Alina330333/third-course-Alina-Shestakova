// 1. СОСТОЯНИЕ ПРОГРАММЫ

const values = [];
// Единственный источник данных — массив чисел.
// Всё, что видит пользователь на странице (список, статистика),
// строится на основе этого массива.
// const — потому что сам массив не заменяется другим,
// меняется только его содержимое (push/pop/length = 0).


// 2. РАБОТА С ДАННЫМИ (чистые функции, без DOM)
//    Эти функции НЕ трогают HTML. Только меняют или читают массив.

function addValue(value) {
  // Добавляет одно число в конец массива
  values.push(value);
}

function removeLastValue() {
  // Удаляет последнее число.
  // Если массив пуст, pop() ничего не делает и не выдаёт ошибку — это нормально.
  values.pop();
}

function clearValues() {
  // Полностью очищает массив.
  // Присваивание length = 0 — самый быстрый способ очистить массив в JS.
  values.length = 0;
}

function getStatistics(values) {
  // Принимает массив и ВОЗВРАЩАЕТ объект со статистикой.
  // Ничего не знает о DOM — это «чистая» функция, её легко тестировать.

  // Особый случай: пустой массив 
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: null,       // null = «значения нет» (не NaN и не Infinity)
      max: null,
      average: null,
    };
  }

  // Обычный случай 
  let sum = 0;
  let min = values[0];   // За начальные min/max берём первый элемент
  let max = values[0];

  for (const value of values) {
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return {
    count: values.length,
    sum: sum,
    min: min,
    max: max,
    average: sum / values.length,
  };
}


// 3. ОТОБРАЖЕНИЕ (связь данных с DOM)

function render() {
  // Единственная функция, которая обновляет страницу.
  // Вызывается ВСЕГДА после того, как массив был изменён.

  // Список чисел 
  const list = document.querySelector('#numbersList');
  list.innerHTML = '';   // Стираем старое содержимое списка

  for (const value of values) {
    const li = document.createElement('li');   // Создаём <li>
    li.textContent = value;                    // Кладём в него число
    list.appendChild(li);                      // Добавляем в <ul>
  }

  // Статистика 
  const stats = getStatistics(values);         // Считаем статистику по массиву

  document.querySelector('#count').textContent = stats.count;
  document.querySelector('#sum').textContent = stats.sum;

  // Для пустого массива показываем «—» вместо null/NaN/Infinity
  document.querySelector('#average').textContent =
    stats.average === null ? '—' : stats.average.toFixed(2);
  // toFixed(2) — округление до 2 знаков после запятой (9 → «9.00»)

  document.querySelector('#min').textContent =
    stats.min === null ? '—' : stats.min;

  document.querySelector('#max').textContent =
    stats.max === null ? '—' : stats.max;
}

function showError(message) {
  // Показывает сообщение об ошибке под формой.
  // Если передать пустую строку '' — ошибка исчезнет.
  document.querySelector('#error').textContent = message;
}


// 4. ОБРАБОТЧИКИ СОБЫТИЙ
//    Каждый обработчик: 1) меняет данные, 2) вызывает render()

// Кнопка «Добавить» 
document.querySelector('#addBtn').addEventListener('click', () => {
  const input = document.querySelector('#numberInput');
  const raw = input.value.trim();
  // input.value возвращает СТРОКУ. trim() убирает пробелы по краям.

  // Отдельно проверяем пустую строку — иначе Number('') вернёт 0,
  // и в список попадёт ноль вместо сообщения об ошибке.
  if (raw === '') {
    showError('Введите корректное число');
    return;   // выходим из обработчика, ничего не меняем
  }

  const value = Number(raw);

  // Проверка: буквы, Infinity и прочее — отсекаем.
  // Number.isFinite() возвращает true только для настоящих конечных чисел.
  if (!Number.isFinite(value)) {
    showError('Введите корректное число');
    return;
  }

  showError('');         // Убираем старую ошибку
  addValue(value);       // 1) меняем данные
  input.value = '';      // Очищаем поле ввода
  input.focus();         // Ставим курсор обратно в поле — удобно вводить подряд
  render();              // 2) обновляем интерфейс
});

// Кнопка «Удалить последнее» 
document.querySelector('#removeBtn').addEventListener('click', () => {
  showError('');
  removeLastValue();     // меняем данные
  render();              // обновляем интерфейс
});

// Кнопка «Очистить» 
document.querySelector('#clearBtn').addEventListener('click', () => {
  showError('');
  clearValues();         // меняем данные
  render();              // обновляем интерфейс
});


// 5. ПЕРВЫЙ ЗАПУСК

render();
// При загрузке страницы сразу рисуем исходное состояние:
// список пуст, count = 0, sum = 0, остальное — «—».
