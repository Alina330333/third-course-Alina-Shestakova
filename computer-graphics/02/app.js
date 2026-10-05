// 1. НАСТРОЙКИ И КОНТЕКСТ CANVAS

const canvas = document.querySelector('#canvas');
// Находим canvas на странице.

const ctx = canvas.getContext('2d');
// Получаем 2D-контекст — объект, через который рисуем.
// Через ctx мы будем вызывать fillRect, beginPath, stroke и т.д.

const scale = 10;
// Масштаб: один логический пиксель = 10×10 экранных.
// Если бы scale был 1, пиксели были бы размером с точку на экране — их не разглядеть.
// При scale=10 каждый пиксель — хорошо заметный квадратик.

const gridW = 40;
// Логическая ширина сетки. На экране это 40 * 10 = 400 пикселей.
// Хватает, чтобы вводить координаты от 0 до 39.

const gridH = 30;
// Логическая высота. На экране 30 * 10 = 300 пикселей.

let noOutput = false;
// Флаг «тихого» режима.
// Когда true — putPixel и addPixelToList ничего не делают.
// Нужен для бенчмарка: замеряем только сам алгоритм, без рисования.
// По умолчанию false — всё работает как обычно.


// 2. ВЫВОД ОДНОГО ПИКСЕЛЯ

function putPixel(x, y, color = 'black') {
  // x, y — координаты в ЛОГИЧЕСКИХ пикселях (0..gridW-1, 0..gridH-1).
  // color по умолчанию чёрный — можно не передавать.

  if (noOutput) return;
  // В режиме замера не рисуем — иначе бенчмарк будет мерить время рисования,
  // а не работу алгоритма.

  ctx.fillStyle = color;
  // Устанавливаем цвет заливки. Это влияет на следующий fillRect.

  ctx.fillRect(x * scale, y * scale, scale, scale);
  // Рисуем квадрат размером scale×scale в нужной позиции.
  // Умножаем логические координаты на scale, чтобы получить экранные.
}


// 3. СЕТКА И ОЧИСТКА

function drawGrid() {
  // Рисуем тонкие светло-серые линии — границы между логическими пикселями.
  // Без них непонятно, где заканчивается один пиксель и начинается другой.

  ctx.strokeStyle = '#e0e0e0';
  // Цвет линий. Очень светлый, чтобы не отвлекать от чёрных пикселей.

  ctx.lineWidth = 1;
  // Толщина линии — 1 экранный пиксель.

  // Вертикальные линии
  for (let x = 0; x <= gridW; x++) {
    // Обратите внимание: <=, а не <.
    // Нам нужна и линия на правом краю (x = gridW), иначе граница будет «открыта».

    ctx.beginPath();
    // Начинаем новый путь. Без этого все линии слились бы в одну.

    ctx.moveTo(x * scale, 0);
    // Перемещаем «перо» в верхнюю точку линии.

    ctx.lineTo(x * scale, gridH * scale);
    // Ведём линию вниз.

    ctx.stroke();
    // Рисуем то, что описали.
  }

  // Горизонтальные линии
  for (let y = 0; y <= gridH; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(gridW * scale, y * scale);
    ctx.stroke();
  }
}

function clearCanvas() {
  // Полностью очищаем холст.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Сразу же рисуем сетку заново — иначе холст будет пустым.
  drawGrid();
}


// 4. ЭЛЕМЕНТЫ СТРАНИЦЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

const pixelsList = document.querySelector('#pixelsList');
// Находим <ul>, куда будем добавлять пиксели.

const stepsBody = document.querySelector('#stepsBody');
// Находим <tbody> таблицы шагов.

function resetOutput() {
  // Перед новым построением стираем результаты прошлого.
  // Иначе пиксели и строки таблицы будут накапливаться.

  pixelsList.innerHTML = '';
  // innerHTML = '' — быстрый способ удалить всё содержимое элемента.

  stepsBody.innerHTML = '';
}

function addPixelToList(x, y) {
  // Добавляет один пиксель в список слева под холстом.

  if (noOutput) return;
  // В бенчмарке список не нужен — иначе он растянется на тысячи строк.

  const li = document.createElement('li');
  // Создаём новый <li> (не привязанный к странице).

  li.textContent = `(${x}, ${y})`;
  // Записываем в него координаты в формате «(2, 3)».

  pixelsList.appendChild(li);
  // Прикрепляем <li> к концу <ul> — теперь он виден на странице.
}

function addStepRow(step, x, y, error, error2, dxChanged, dyChanged) {
  // Добавляет одну строку в таблицу шагов Брезенхема.

  const tr = document.createElement('tr');
  // Создаём строку таблицы.

  tr.innerHTML = `
    <td>${step}</td>
    <td>${x}</td>
    <td>${y}</td>
    <td>${error}</td>
    <td>${error2}</td>
    <td>${dxChanged ? '+1' : '—'}</td>
    <td>${dyChanged ? '+1' : '—'}</td>
  `;
  // Заполняем её ячейками.
  // В последних двух колонках: если координата изменилась — пишем «+1», иначе «—».
  // ${...} — вставка значения переменной в строку (шаблонные строки).

  stepsBody.appendChild(tr);
  // Прикрепляем строку в конец таблицы.
}


// 5. АЛГОРИТМ ЦДА (из первой лабы)

function lineDDA(x1, y1, x2, y2) {
  // ЦДА — «цифровой дифференциальный анализатор».
  // Идея: идём от точки к точке маленькими приращениями и округляем.

  const dx = x2 - x1;
  // Изменение по x. Может быть отрицательным, если x2 < x1.

  const dy = y2 - y1;
  // Изменение по y.

  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  // Количество шагов = максимум из модулей dx и dy.
  // Если взять меньше, вдоль длинной оси появятся «дыры».

  if (steps === 0) {
    // Особый случай: начало и конец совпадают.
    // dx = dy = 0, steps = 0 → дальше делить нельзя.
    putPixel(x1, y1);
    addPixelToList(x1, y1);
    return;
  }

  const xStep = dx / steps;
  // Насколько x меняется за один шаг. Это ДРОБНОЕ число.

  const yStep = dy / steps;
  // То же для y.

  let x = x1;
  let y = y1;

  for (let i = 0; i <= steps; i++) {
    // i от 0 до steps ВКЛЮЧИТЕЛЬНО — чтобы попасть и в начало, и в конец.

    const px = Math.round(x);
    const py = Math.round(y);
    // Округляем дробные координаты до целых — пиксель может быть только целым.

    putPixel(px, py);
    addPixelToList(px, py);

    x += xStep;
    // Прибавляем приращение для следующего шага.

    y += yStep;
  }
}


// 6. АЛГОРИТМ БРЕЗЕНХЕМА (универсальный)

function lineBresenham(x1, y1, x2, y2, trackSteps = false) {
  // Брезенхем работает только с целыми числами.
  // Вместо округления он накапливает «ошибку» — отклонение от идеальной линии.
  // trackSteps — если true, добавляем строки в таблицу шагов.

  let x = x1;
  let y = y1;
  // Текущая позиция. Будем двигаться к (x2, y2).

  const dx = Math.abs(x2 - x1);
  // Длина изменения по x БЕЗ знака — нам важна только величина.

  const dy = Math.abs(y2 - y1);
  // То же для y.

  const sx = x1 < x2 ? 1 : -1;
  // Направление по x: +1 если идём вправо, -1 если влево.
  // Это позволяет алгоритму работать в обе стороны.
  // Тернарный оператор: (условие) ? (если true) : (если false).

  const sy = y1 < y2 ? 1 : -1;
  // То же для y: +1 вниз, -1 вверх.

  let error = dx - dy;
  // Начальная ошибка. Это ключевая величина алгоритма.

  let step = 0;
  // Счётчик шагов — нужен для таблицы.

  while (true) {
    // Бесконечный цикл. Внутри есть условие выхода — break.

    putPixel(x, y);
    addPixelToList(x, y);

    if (trackSteps) {
      // Если нужна таблица — записываем текущее состояние до сдвига.
      const error2 = 2 * error;
      // Удвоенная ошибка — сравниваем с dx и dy без делений и дробей.

      const willChangeX = error2 > -dy;
      // Собираемся ли сдвинуться по x?

      const willChangeY = error2 < dx;
      // Собираемся ли сдвинуться по y?

      addStepRow(step, x, y, error, error2, willChangeX, willChangeY);
    }

    if (x === x2 && y === y2) break;
    // Дошли до конца — выходим из цикла.

    const error2 = 2 * error;

    if (error2 > -dy) {
      // Условие сдвига по x.
      error -= dy;
      // Уменьшаем ошибку на dy.
      x += sx;
      // Двигаем x в нужном направлении.
    }

    if (error2 < dx) {
      // Условие сдвига по y. ВАЖНО: это отдельный if, не else if!
      // На диагональных шагах срабатывают оба условия — и x, и y меняются сразу.
      error += dx;
      y += sy;
    }

    step++;
    // Увеличиваем номер шага.
  }
}


// 7. ОБРАБОТКА КНОПКИ «ПОСТРОИТЬ»

document.querySelector('#buildBtn').addEventListener('click', () => {
  // Вешаем обработчик клика на кнопку «Построить».

  const x1 = parseInt(document.querySelector('#x1').value, 10);
  // Читаем значение поля X1. input.value возвращает СТРОКУ,
  // parseInt превращает её в целое число (второй аргумент — основание системы счисления).

  const y1 = parseInt(document.querySelector('#y1').value, 10);
  const x2 = parseInt(document.querySelector('#x2').value, 10);
  const y2 = parseInt(document.querySelector('#y2').value, 10);
  // То же для остальных полей.

  const algo = document.querySelector('#algo').value;
  // Читаем, какой алгоритм выбран: "dda" или "bresenham".

  clearCanvas();
  // Очищаем холст и заново рисуем сетку.

  resetOutput();
  // Очищаем список пикселей и таблицу шагов.

  if (algo === 'dda') {
    lineDDA(x1, y1, x2, y2);
    // Строим ЦДА. Таблица шагов не заполняется — там другая логика.
  } else {
    lineBresenham(x1, y1, x2, y2, true);
    // Строим Брезенхем. trackSteps = true, чтобы заполнить таблицу.
  }
});


// 8. СРАВНЕНИЕ СКОРОСТИ (БЕНЧМАРК)

document.querySelector('#benchBtn').addEventListener('click', () => {
  // Клик по кнопке «Сравнить скорость».

  const N = 1000;
  // Сколько случайных линий строим каждым алгоритмом.

  const segments = [];
  // Массив, куда сложим все случайные отрезки.

  for (let i = 0; i < N; i++) {
    segments.push([
      Math.floor(Math.random() * gridW),
      Math.floor(Math.random() * gridH),
      Math.floor(Math.random() * gridW),
      Math.floor(Math.random() * gridH),
    ]);
    // Math.random() даёт число от 0 до 1 (не включая 1).
    // Умножаем на gridW/gridH и округляем вниз — получаем целые координаты в диапазоне сетки.
    // В массиве получается четыре числа: x1, y1, x2, y2.
  }

  noOutput = true;
  // Включаем «тихий» режим: рисование и список отключены.
  // Замеряем только работу самих алгоритмов.

  // ЦДА 
  let start = performance.now();
  // performance.now() возвращает текущее время в миллисекундах с высокой точностью.
  // Используется для замеров производительности.

  for (const [a, b, c, d] of segments) {
    // Деструктуризация массива: берём 4 числа и раскладываем в переменные.

    lineDDA(a, b, c, d);
  }

  const ddaTime = performance.now() - start;
  // Разница — сколько миллисекунд заняли все линии ЦДА.

  // Брезенхем 
  start = performance.now();

  for (const [a, b, c, d] of segments) {
    lineBresenham(a, b, c, d, false);
    // trackSteps = false — таблица не нужна, нам важна только скорость.
  }

  const bresTime = performance.now() - start;

  noOutput = false;
  // Выключаем «тихий» режим обратно — вернулись в обычное состояние.

  console.log(`ЦДА:       ${ddaTime.toFixed(2)} мс`);
  console.log(`Брезенхем: ${bresTime.toFixed(2)} мс`);
  // Выводим результаты в консоль (F12 → Console).
  // toFixed(2) — округление до 2 знаков после запятой.

  alert(
    'Готово! Результаты в консоли (F12):\n' +
    `ЦДА:       ${ddaTime.toFixed(2)} мс\n` +
    `Брезенхем: ${bresTime.toFixed(2)} мс`
  );
  // Показываем alert — пользователь сразу видит результат,
  // даже если не открыл консоль.
});


// 9. ПЕРВЫЙ ЗАПУСК

clearCanvas();
// При загрузке страницы сразу рисуем сетку — чтобы холст не был пустым.
