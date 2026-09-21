// 1. НАСТРОЙКИ И ПОЛУЧЕНИЕ КОНТЕКСТА CANVAS

const canvas = document.querySelector('#canvas');
// Находим <canvas id="canvas"> на странице

const ctx = canvas.getContext('2d');
// Получаем 2D-контекст — объект, через который рисуем на холсте

const scale = 10;
// Масштаб: один логический пиксель = 10×10 экранных пикселей.
// Так отдельные пиксели будут хорошо видны.

const gridW = 40;   // Логическая ширина сетки — 40 пикселей
const gridH = 30;   // Логическая высота сетки — 30 пикселей


// 2. ФУНКЦИЯ ВЫВОДА ОДНОГО ЛОГИЧЕСКОГО ПИКСЕЛЯ

function putPixel(x, y, color = 'black') {
  // x, y — координаты в ЛОГИЧЕСКИХ пикселях (целые числа от 0 до gridW/gridH)
  // Умножаем на scale, чтобы получить позицию на экране
  ctx.fillStyle = color;
  // Устанавливаем цвет заливки

  ctx.fillRect(x * scale, y * scale, scale, scale);
  // Рисуем квадрат размером scale×scale в нужном месте.
  // Это и есть один "увеличенный" пиксель.
}


// 3. СЕТКА И ОЧИСТКА

function drawGrid() {
  // Рисуем тонкие серые линии, чтобы видеть границы пикселей

  ctx.strokeStyle = '#e0e0e0';   // Светло-серый цвет линий
  ctx.lineWidth = 1;             // Толщина 1 пиксель

  // Вертикальные линии
  for (let x = 0; x <= gridW; x++) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);                 // От верхнего края
    ctx.lineTo(x * scale, gridH * scale);     // До нижнего
    ctx.stroke();
  }

  // Горизонтальные линии
  for (let y = 0; y <= gridH; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);                 // От левого края
    ctx.lineTo(gridW * scale, y * scale);     // До правого
    ctx.stroke();
  }
}

function clearCanvas() {
  // Полностью очищаем холст
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Сразу же рисуем сетку заново
  drawGrid();
}


// 4. АЛГОРИТМ ЦДА (построение отрезка)

function lineDDA(x1, y1, x2, y2) {
  // Очищаем таблицу перед новым построением
  const stepsBody = document.querySelector('#stepsBody');
  stepsBody.innerHTML = '';

  // Вычисляем разности координат
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Количество шагов = максимум из модулей dx и dy
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  // Особый случай: начало и конец совпадают
  if (steps === 0) {
    putPixel(x1, y1, 'black');      // Ставим ровно один пиксель
    addTableRow(0, x1, y1, x1, y1); // Добавляем одну строку в таблицу
    return;
  }

  // Приращение на каждом шаге (может быть дробным)
  const xStep = dx / steps;
  const yStep = dy / steps;

  // Начинаем с первой точки
  let x = x1;
  let y = y1;

  // Цикл по всем шагам ВКЛЮЧИТЕЛЬНО (i <= steps),
  // чтобы попасть и в начальную, и в конечную точку
  for (let i = 0; i <= steps; i++) {
    // Округляем текущие координаты до целых — это и есть пиксель
    const px = Math.round(x);
    const py = Math.round(y);

    // Рисуем пиксель
    putPixel(px, py, 'black');

    // Добавляем строку в таблицу шагов
    // x и y показываем с двумя знаками после запятой, чтобы было видно дробную часть
    addTableRow(i, x.toFixed(2), y.toFixed(2), px, py);

    // Прибавляем приращение для следующего шага
    x += xStep;
    y += yStep;
  }
}


// 5. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ДОБАВЛЕНИЕ СТРОКИ В ТАБЛИЦУ

function addTableRow(step, xRaw, yRaw, px, py) {
  const tbody = document.querySelector('#stepsBody');

  // Создаём новый <tr>
  const tr = document.createElement('tr');

  // Заполняем его пятью ячейками
  tr.innerHTML = `
    <td>${step}</td>
    <td>${xRaw}</td>
    <td>${yRaw}</td>
    <td>${px}</td>
    <td>${py}</td>
  `;

  // Добавляем строку в конец таблицы
  tbody.appendChild(tr);
}


// 6. ОБРАБОТКА КНОПКИ "ПОСТРОИТЬ"

document.querySelector('#buildBtn').addEventListener('click', () => {
  // Читаем значения из полей ввода и превращаем их в целые числа
  const x1 = parseInt(document.querySelector('#x1').value, 10);
  const y1 = parseInt(document.querySelector('#y1').value, 10);
  const x2 = parseInt(document.querySelector('#x2').value, 10);
  const y2 = parseInt(document.querySelector('#y2').value, 10);

  // 1. Очищаем холст и заново рисуем сетку
  clearCanvas();

  // 2. Строим отрезок по алгоритму ЦДА
  lineDDA(x1, y1, x2, y2);
});


// 7. ПЕРВЫЙ ЗАПУСК

clearCanvas();
// При загрузке страницы сразу рисуем сетку, чтобы холст был не пустой.
