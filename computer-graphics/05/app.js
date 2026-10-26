const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const scale = 10;
const W = 40; // ширина сетки
const H = 30; // высота сетки

// Состояния ячейки
const EMPTY = 0;
const BORDER = 1;
const FILLED = 2;

// Логическая сетка (одномерный массив)
const grid = new Array(W * H).fill(EMPTY);

// Состояние для пошагового Flood Fill
let floodHistory = [];
let currentStep = 0;
let isFloodMode = true;

const scanlineInfo = document.querySelector('#scanlineInfo');
const stepInfo = document.querySelector('#stepInfo');

// Инициализация многоугольника (невыпуклый)
const polygon = [
  { x: 5, y: 5 }, { x: 25, y: 5 }, { x: 25, y: 15 },
  { x: 15, y: 15 }, { x: 15, y: 25 }, { x: 5, y: 25 }
];


// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

function getIndex(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return -1;
  return y * W + x;
}

function putPixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

// Отрисовка сетки и контура
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Рисуем сетку
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x++) {
    ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, H * scale); ctx.stroke();
  }
  for (let y = 0; y <= H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(W * scale, y * scale); ctx.stroke();
  }

  // Рисуем ячейки
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const val = grid[getIndex(x, y)];
      if (val === BORDER) putPixel(x, y, '#333');
      else if (val === FILLED) putPixel(x, y, '#007bff');
    }
  }
}


// АЛГОРИТМЫ ЗАЛИВКИ

// 1. Flood Fill (4-связность)
function floodFill(startX, startY) {
  if (grid[getIndex(startX, startY)] !== EMPTY) return;

  floodHistory = [];
  currentStep = 0;

  const stack = [{ x: startX, y: startY }];
  const visited = new Set();
  
  const directions = [ [0, -1], [0, 1], [-1, 0], [1, 0] ]; // N, S, W, E

  while (stack.length > 0) {
    const { x, y } = stack.pop();
    const idx = getIndex(x, y);

    if (idx === -1) continue;
    if (grid[idx] !== EMPTY) continue;
    if (visited.has(idx)) continue;

    visited.add(idx);
    grid[idx] = FILLED; // Закрашиваем
    floodHistory.push({ x, y }); // Запоминаем шаг

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (getIndex(nx, ny) !== -1 && grid[getIndex(nx, ny)] === EMPTY) {
        stack.push({ x: nx, y: ny });
      }
    }
  }

  render();
  updateStepUI();
}

// Отрисовка шага Flood Fill
function renderFloodStep(step) {
  // Сбрасываем заливку, оставляя только границы
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === FILLED) grid[i] = EMPTY;
  }

  // Заливаем только до текущего шага
  for (let i = 0; i < step; i++) {
    const p = floodHistory[i];
    if (p) grid[getIndex(p.x, p.y)] = FILLED;
  }

  render();
  updateStepUI();
}

function updateStepUI() {
  stepInfo.textContent = `Шаг: ${currentStep} из ${floodHistory.length}`;
  document.querySelector('#btnStepBack').disabled = currentStep === 0;
  document.querySelector('#btnStepForward').disabled = currentStep === floodHistory.length;
}


// 2. Scanline Fill
function scanlineFill(scanY) {
  scanlineInfo.innerHTML = '';

  const intersections = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];

    if (a.y === b.y) continue; // Горизонтальные пропускаем

    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);

    // Правило: включаем yMin, не включаем yMax
    if (scanY < yMin || scanY >= yMax) continue;

    const x = a.x + ((scanY - a.y) * (b.x - a.x)) / (b.y - a.y);
    intersections.push(x);
  }

  intersections.sort((a, b) => a - b);

  let intervals = [];
  for (let i = 0; i < intersections.length; i += 2) {
    const xStart = Math.ceil(intersections[i]);
    const xEnd = Math.floor(intersections[i + 1]);
    
    if (xStart <= xEnd) {
      intervals.push({ start: xStart, end: xEnd });
      for (let x = xStart; x <= xEnd; x++) {
        grid[getIndex(x, scanY)] = FILLED;
      }
    }
  }

  // Выводим таблицу
  scanlineInfo.innerHTML = `
    <p><b>y = ${scanY}</b></p>
    <p>Пересечения X: [${intersections.map(x => x.toFixed(1)).join(', ')}]</p>
    <p>Интервалы: ${intervals.map(iv => `[${iv.start}..${iv.end}]`).join(', ')}</p>
  `;

  render();
}


// ИНИЦИАЛИЗАЦИЯ КОНТУРА (Брезенхем)

function drawLine(x1, y1, x2, y2) {
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);
  let sx = (x1 < x2) ? 1 : -1;
  let sy = (y1 < y2) ? 1 : -1;
  let err = dx - dy;

  while (true) {
    const idx = getIndex(x1, y1);
    if (idx !== -1) grid[idx] = BORDER;

    if (x1 === x2 && y1 === y2) break;
    let e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x1 += sx; }
    if (e2 < dx) { err += dx; y1 += sy; }
  }
}

function initPolygon() {
  // Очищаем сетку
  for (let i = 0; i < grid.length; i++) grid[i] = EMPTY;

  // Рисуем стороны
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    drawLine(a.x, a.y, b.x, b.y);
  }

  floodHistory = [];
  currentStep = 0;
  render();
  updateStepUI();
}


// СОБЫТИЯ

document.querySelector('#btnFlood').addEventListener('click', () => {
  isFloodMode = true;
  document.querySelector('#btnFlood').classList.add('active');
  document.querySelector('#btnScanline').classList.remove('active');
});

document.querySelector('#btnScanline').addEventListener('click', () => {
  isFloodMode = false;
  document.querySelector('#btnFlood').classList.remove('active');
  document.querySelector('#btnScanline').classList.add('active');
});

document.querySelector('#btnClear').addEventListener('click', () => {
  initPolygon();
  scanlineInfo.innerHTML = 'Здесь появятся данные о пересечениях и интервалах.';
});

// Шаги
document.querySelector('#btnStepBack').addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    renderFloodStep(currentStep);
  }
});

document.querySelector('#btnStepForward').addEventListener('click', () => {
  if (currentStep < floodHistory.length) {
    currentStep++;
    renderFloodStep(currentStep);
  }
});

// Клик по холсту
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = Math.floor((e.clientX - rect.left) / scale);
  const clickY = Math.floor((e.clientY - rect.top) / scale);

  if (clickX < 0 || clickX >= W || clickY < 0 || clickY >= H) return;

  if (isFloodMode) {
    floodFill(clickX, clickY);
  } else {
    scanlineFill(clickY);
  }
});


// Запуск
initPolygon();
