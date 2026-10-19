const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const scale = 10;
const gridW = 40;
const gridH = 30;

const stepsBody = document.querySelector('#stepsBody');
const errorEl = document.querySelector('#error');
const codesDisplay = document.querySelector('#codesDisplay');
const statsDisplay = document.querySelector('#statsDisplay');

// Константы битовых кодов
const INSIDE = 0; // 0000
const LEFT   = 1; // 0001
const RIGHT  = 2; // 0010
const BOTTOM = 4; // 0100
const TOP    = 8; // 1000


// Отрисовка одного логического пикселя
function putPixel(x, y, color = 'black') {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

// Отрисовка линии (для наглядности используем ctx.moveTo/lineTo)
function drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1 * scale + scale / 2, y1 * scale + scale / 2);
  ctx.lineTo(x2 * scale + scale / 2, y2 * scale + scale / 2);
  ctx.stroke();
}

// Сетка
function drawGrid() {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= gridW; x++) {
    ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, gridH * scale); ctx.stroke();
  }
  for (let y = 0; y <= gridH; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(gridW * scale, y * scale); ctx.stroke();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}


// 1. Получение кода точки
function getCode(x, y, rect) {
  let code = INSIDE;
  if (x < rect.xmin) code |= LEFT;
  else if (x > rect.xmax) code |= RIGHT;
  if (y < rect.ymin) code |= TOP;
  else if (y > rect.ymax) code |= BOTTOM;
  return code;
}

// Вывод кода в двоичном виде (4 бита)
function codeToString(code) {
  return code.toString(2).padStart(4, '0');
}

// Добавление строки в таблицу
function addStepRow(step, A, codeA, B, codeB, action) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${step}</td>
    <td>(${A.x.toFixed(1)}, ${A.y.toFixed(1)})</td>
    <td>${codeToString(codeA)}</td>
    <td>(${B.x.toFixed(1)}, ${B.y.toFixed(1)})</td>
    <td>${codeToString(codeB)}</td>
    <td>${action}</td>
  `;
  stepsBody.appendChild(tr);
}


// 2. Основной алгоритм
function clipLine(x1, y1, x2, y2, rect, track = false) {
  let code1 = getCode(x1, y1, rect);
  let code2 = getCode(x2, y2, rect);
  let step = 0;
  let accepted = false;

  if (track) {
    stepsBody.innerHTML = '';
    addStepRow(step, {x: x1, y: y1}, code1, {x: x2, y: y2}, code2, 'Начало');
  }

  while (true) {
    if ((code1 | code2) === 0) {
      accepted = true;
      if (track) addStepRow(++step, {x: x1, y: y1}, code1, {x: x2, y: y2}, code2, 'ACCEPT (внутри)');
      break;
    }

    if ((code1 & code2) !== 0) {
      if (track) addStepRow(++step, {x: x1, y: y1}, code1, {x: x2, y: y2}, code2, 'REJECT (снаружи)');
      break;
    }

    const codeOut = code1 !== 0 ? code1 : code2;
    let x, y;
    let actionText = '';

    if (codeOut & TOP) {
      const t = (rect.ymin - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1);
      y = rect.ymin;
      actionText = 'Пересечение TOP';
    } else if (codeOut & BOTTOM) {
      const t = (rect.ymax - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1);
      y = rect.ymax;
      actionText = 'Пересечение BOTTOM';
    } else if (codeOut & RIGHT) {
      const t = (rect.xmax - x1) / (x2 - x1);
      x = rect.xmax;
      y = y1 + t * (y2 - y1);
      actionText = 'Пересечение RIGHT';
    } else {
      const t = (rect.xmin - x1) / (x2 - x1);
      x = rect.xmin;
      y = y1 + t * (y2 - y1);
      actionText = 'Пересечение LEFT';
    }

    if (codeOut === code1) {
      x1 = x; y1 = y;
      code1 = getCode(x1, y1, rect);
    } else {
      x2 = x; y2 = y;
      code2 = getCode(x2, y2, rect);
    }

    if (track) addStepRow(++step, {x: x1, y: y1}, code1, {x: x2, y: y2}, code2, actionText);
  }

  return accepted ? { x1, y1, x2, y2 } : null;
}


// 3. Вспомогательная функция для отрисовки результата
function drawScene(rect, lines) {
  clearCanvas();
  
  // Рисуем границы окна (красным пунктиром или жирным)
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.xmin * scale, rect.ymin * scale, (rect.xmax - rect.xmin) * scale, (rect.ymax - rect.ymin) * scale);

  // Рисуем все отрезки
  for (const line of lines) {
    // Исходная часть (серая, тонкая)
    drawLine(line.x1, line.y1, line.x2, line.y2, '#cccccc', 1);

    // Отсеченная часть (черная, толстая)
    const clipped = clipLine(line.x1, line.y1, line.x2, line.y2, rect, false);
    if (clipped) {
      drawLine(clipped.x1, clipped.y1, clipped.x2, clipped.y2, 'black', 3);
    }
  }
}

// Чтение значений из полей
function getRect() {
  return {
    xmin: parseInt(document.querySelector('#xmin').value, 10),
    ymin: parseInt(document.querySelector('#ymin').value, 10),
    xmax: parseInt(document.querySelector('#xmax').value, 10),
    ymax: parseInt(document.querySelector('#ymax').value, 10),
  };
}


//  Обработчики кнопок 

document.querySelector('#buildBtn').addEventListener('click', () => {
  const rect = getRect();
  
  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) {
    errorEl.textContent = 'Ошибка: xmin должно быть < xmax, ymin < ymax';
    return;
  }
  errorEl.textContent = '';

  const x1 = parseInt(document.querySelector('#x1').value, 10);
  const y1 = parseInt(document.querySelector('#y1').value, 10);
  const x2 = parseInt(document.querySelector('#x2').value, 10);
  const y2 = parseInt(document.querySelector('#y2').value, 10);

  drawScene(rect, [{x1, y1, x2, y2}]);
  
  // Выводим коды концов
  const c1 = getCode(x1, y1, rect);
  const c2 = getCode(x2, y2, rect);
  codesDisplay.textContent = `Коды концов: A = ${codeToString(c1)} | B = ${codeToString(c2)}`;

  // Запускаем алгоритм для построения таблицы
  clipLine(x1, y1, x2, y2, rect, true);
});

document.querySelector('#clearBtn').addEventListener('click', () => {
  clearCanvas();
  stepsBody.innerHTML = '';
  codesDisplay.textContent = 'Коды концов: -';
  statsDisplay.textContent = '';
  errorEl.textContent = '';
});

document.querySelector('#polyBtn').addEventListener('click', () => {
  const rect = getRect();
  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) {
    errorEl.textContent = 'Ошибка: xmin должно быть < xmax, ymin < ymax';
    return;
  }
  errorEl.textContent = '';

  // Пример ломаной
  const points = [
    { x: 2, y: 5 },
    { x: 12, y: 2 },
    { x: 20, y: 18 },
    { x: 30, y: 8 },
    { x: 36, y: 22 }
  ];

  const lines = [];
  for (let i = 0; i < points.length - 1; i++) {
    lines.push({ x1: points[i].x, y1: points[i].y, x2: points[i+1].x, y2: points[i+1].y });
  }

  drawScene(rect, lines);
  stepsBody.innerHTML = '';
  codesDisplay.textContent = 'Режим ломаной';
});

document.querySelector('#randBtn').addEventListener('click', () => {
  const rect = getRect();
  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) {
    errorEl.textContent = 'Ошибка: xmin должно быть < xmax, ymin < ymax';
    return;
  }
  errorEl.textContent = '';

  const lines = [];
  let accepted = 0, rejected = 0, clippedCount = 0;

  for (let i = 0; i < 100; i++) {
    const x1 = Math.floor(Math.random() * 40);
    const y1 = Math.floor(Math.random() * 30);
    const x2 = Math.floor(Math.random() * 40);
    const y2 = Math.floor(Math.random() * 30);
    
    lines.push({x1, y1, x2, y2});
    
    const c1 = getCode(x1, y1, rect);
    const c2 = getCode(x2, y2, rect);
    const clipped = clipLine(x1, y1, x2, y2, rect, false);
    
    if (!clipped) {
      rejected++;
    } else if (c1 === 0 && c2 === 0) {
      accepted++;
    } else {
      clippedCount++;
    }
  }

  drawScene(rect, lines);
  
  stepsBody.innerHTML = '';
  codesDisplay.textContent = 'Режим случайных отрезков';
  statsDisplay.innerHTML = `
    <b>Статистика по 100 отрезкам:</b><br>
    Принято без изменений: ${accepted}<br>
    Отсечено (частично): ${clippedCount}<br>
    Полностью отброшено: ${rejected}
  `;
});

// Первый запуск
clearCanvas();
