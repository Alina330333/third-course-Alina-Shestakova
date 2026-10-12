// настройки canvas
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const scale = 10;
const gridW = 40;
const gridH = 30;

let noOutput = false;   // тихий режим для бенчмарка

const pixelsList = document.querySelector('#pixelsList');
const stepsBody = document.querySelector('#stepsBody');


// вывод одного логического пикселя
function putPixel(x, y, color = 'black') {
  if (noOutput) return;
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

// сетка
function drawGrid() {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= gridW; x++) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);
    ctx.lineTo(x * scale, gridH * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= gridH; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(gridW * scale, y * scale);
    ctx.stroke();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}

function resetOutput() {
  pixelsList.innerHTML = '';
  stepsBody.innerHTML = '';
}

function addPixelToList(x, y) {
  if (noOutput) return;
  const li = document.createElement('li');
  li.textContent = `(${x}, ${y})`;
  pixelsList.appendChild(li);
}

function addStepRow(step, x, y, dBefore, variant, dAfter) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${step}</td>
    <td>${x}</td>
    <td>${y}</td>
    <td>${dBefore}</td>
    <td>${variant}</td>
    <td>${dAfter}</td>
  `;
  stepsBody.appendChild(tr);
}


// 8 симметричных точек от одной базовой (x, y)
function plot8(cx, cy, x, y, color = 'black', addToTable = false) {
  // пары координат из симметрии
  const points = [
    [cx + x, cy + y],
    [cx + y, cy + x],
    [cx - x, cy + y],
    [cx - y, cy + x],
    [cx + x, cy - y],
    [cx + y, cy - x],
    [cx - x, cy - y],
    [cx - y, cy - x],
  ];

  for (const [px, py] of points) {
    putPixel(px, py, color);
    if (addToTable) addPixelToList(px, py);
  }
}


// основная функция: окружность алгоритмом средней точки
function circleMidpoint(cx, cy, r, trackSteps = false, highlight = false) {
  let x = 0;
  let y = r;
  let d = 1 - r;
  let step = 0;

  while (x <= y) {
    // строим 8 симметричных точек для текущей (x, y)
    plot8(cx, cy, x, y, 'black', true);

    if (trackSteps) {
      // сохраняем состояние ДО обновления
      const dBefore = d;
      let variant;

      if (d < 0) {
        // вариант E: y не меняется
        variant = 'E';
      } else {
        // вариант SE: y уменьшается
        variant = 'SE';
      }

      // считаем d после по той же ветке
      let dAfter = d;
      if (d < 0) {
        dAfter += 2 * x + 3;
      } else {
        dAfter += 2 * (x - y) + 5;
      }

      addStepRow(step, x, y, dBefore, variant, dAfter);
    }

    if (highlight && step === 0) {
      // подсвечиваем первую базовую точку красным
      plot8(cx, cy, x, y, 'red');
    }

    // обновляем d и y
    if (d < 0) {
      d += 2 * x + 3;
    } else {
      d += 2 * (x - y) + 5;
      y -= 1;
    }
    x += 1;
    step += 1;
  }
}


// второй способ: через формулу y = sqrt(r^2 - x^2) с округлением
function circleFormula(cx, cy, r) {
  for (let x = 0; x <= r; x++) {
    const y = Math.round(Math.sqrt(r * r - x * x));
    plot8(cx, cy, x, y, 'blue', false);
    if (x >= y) break;   // дальше пойдут дубли
  }
}


// обработчики кнопок

document.querySelector('#buildBtn').addEventListener('click', () => {
  const cx = parseInt(document.querySelector('#cx').value, 10);
  const cy = parseInt(document.querySelector('#cy').value, 10);
  const r = parseInt(document.querySelector('#r').value, 10);
  const highlight = document.querySelector('#highlightStep').checked;

  // проверка радиуса
  if (!Number.isFinite(r) || r <= 0) {
    document.querySelector('#error').textContent = 'Радиус должен быть больше 0';
    return;
  }
  document.querySelector('#error').textContent = '';

  clearCanvas();
  resetOutput();
  circleMidpoint(cx, cy, r, true, highlight);
});

document.querySelector('#clearBtn').addEventListener('click', () => {
  clearCanvas();
  resetOutput();
  document.querySelector('#error').textContent = '';
});

document.querySelector('#compareBtn').addEventListener('click', () => {
  const cx = parseInt(document.querySelector('#cx').value, 10);
  const cy = parseInt(document.querySelector('#cy').value, 10);
  const r = parseInt(document.querySelector('#r').value, 10);

  if (!Number.isFinite(r) || r <= 0) {
    document.querySelector('#error').textContent = 'Радиус должен быть больше 0';
    return;
  }
  document.querySelector('#error').textContent = '';

  clearCanvas();
  resetOutput();

  // чёрным — средняя точка, синим — формула. Наложим друг на друга.
  circleMidpoint(cx, cy, r, false, false);
  circleFormula(cx, cy, r);
});


// стартовая отрисовка
clearCanvas();
