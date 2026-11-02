const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const scale = 10;

// Исходный многоугольник (невыпуклый)
const originalPolygon = [
  { x: 5, y: 5 },
  { x: 25, y: 5 },
  { x: 25, y: 15 },
  { x: 15, y: 15 },
  { x: 15, y: 25 },
  { x: 5, y: 25 }
];

// Массив для хранения промежуточных результатов
let stages = [];

// Вспомогательные функции пересечения
function intersectVertical(a, b, xBoundary) {
  const t = (xBoundary - a.x) / (b.x - a.x);
  return {
    x: xBoundary,
    y: a.y + t * (b.y - a.y)
  };
}

function intersectHorizontal(a, b, yBoundary) {
  const t = (yBoundary - a.y) / (b.y - a.y);
  return {
    x: a.x + t * (b.x - a.x),
    y: yBoundary
  };
}

// Обработка одной границы
function clipAgainstBoundary(polygon, isInside, getIntersection) {
  const output = [];
  if (polygon.length === 0) return output;

  let s = polygon[polygon.length - 1]; // Начинаем с последней точки

  for (const p of polygon) {
    const sInside = isInside(s);
    const pInside = isInside(p);

    if (sInside && pInside) {
      output.push(p);
    } else if (sInside && !pInside) {
      output.push(getIntersection(s, p));
    } else if (!sInside && pInside) {
      output.push(getIntersection(s, p));
      output.push(p);
    }
    // Если оба снаружи — ничего не добавляем

    s = p;
  }
  return output;
}

// Полный алгоритм
function clipPolygon(polygon, rect) {
  let result = polygon;
  stages = []; // Очищаем историю
  stages.push({ name: 'Исходный', points: [...result] });

  // 1. LEFT
  result = clipAgainstBoundary(result, p => p.x >= rect.xmin, (a, b) => intersectVertical(a, b, rect.xmin));
  stages.push({ name: 'LEFT', points: [...result] });
  if (result.length === 0) return result;

  // 2. RIGHT
  result = clipAgainstBoundary(result, p => p.x <= rect.xmax, (a, b) => intersectVertical(a, b, rect.xmax));
  stages.push({ name: 'RIGHT', points: [...result] });
  if (result.length === 0) return result;

  // 3. TOP
  result = clipAgainstBoundary(result, p => p.y >= rect.ymin, (a, b) => intersectHorizontal(a, b, rect.ymin));
  stages.push({ name: 'TOP', points: [...result] });
  if (result.length === 0) return result;

  // 4. BOTTOM
  result = clipAgainstBoundary(result, p => p.y <= rect.ymax, (a, b) => intersectHorizontal(a, b, rect.ymax));
  stages.push({ name: 'BOTTOM', points: [...result] });

  return result;
}


// Отрисовка
function drawPolygon(points, color, lineWidth = 2) {
  if (points.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  
  ctx.moveTo(points[0].x * scale, points[0].y * scale);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * scale, points[i].y * scale);
  }
  ctx.closePath();
  ctx.stroke();
}

function render(rect, stageIndex = 4) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Сетка
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 60; i++) { ctx.beginPath(); ctx.moveTo(i * scale, 0); ctx.lineTo(i * scale, 450); ctx.stroke(); }
  for (let i = 0; i <= 45; i++) { ctx.beginPath(); ctx.moveTo(0, i * scale); ctx.lineTo(600, i * scale); ctx.stroke(); }

  // Окно отсечения (красное)
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.xmin * scale, rect.ymin * scale, (rect.xmax - rect.xmin) * scale, (rect.ymax - rect.ymin) * scale);

  // Исходный контур (серый)
  drawPolygon(originalPolygon, '#ccc', 1);

  // Текущий этап (синий)
  if (stages[stageIndex]) {
    drawPolygon(stages[stageIndex].points, 'blue', 2);
  }
}

// Обновление таблицы
function updateTable() {
  const tbody = document.querySelector('#stageTableBody');
  tbody.innerHTML = '';
  
  stages.forEach(stage => {
    const tr = document.createElement('tr');
    const coords = stage.points.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(', ');
    tr.innerHTML = `<td>${stage.name}</td><td>${stage.points.length}</td><td>${coords || '—'}</td>`;
    tbody.appendChild(tr);
  });
}


// Обработчики
document.querySelector('#buildBtn').addEventListener('click', () => {
  const rect = {
    xmin: parseInt(document.querySelector('#xmin').value, 10),
    ymin: parseInt(document.querySelector('#ymin').value, 10),
    xmax: parseInt(document.querySelector('#xmax').value, 10),
    ymax: parseInt(document.querySelector('#ymax').value, 10)
  };

  clipPolygon(originalPolygon, rect);
  updateTable();
  
  const stageIndex = parseInt(document.querySelector('#stageSelect').value, 10);
  render(rect, stageIndex);
});

document.querySelector('#stageSelect').addEventListener('change', (e) => {
  const rect = {
    xmin: parseInt(document.querySelector('#xmin').value, 10),
    ymin: parseInt(document.querySelector('#ymin').value, 10),
    xmax: parseInt(document.querySelector('#xmax').value, 10),
    ymax: parseInt(document.querySelector('#ymax').value, 10)
  };
  render(rect, parseInt(e.target.value, 10));
});

document.querySelector('#clearBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.querySelector('#stageTableBody').innerHTML = '';
});

// Первичная отрисовка
render({xmin: 10, ymin: 10, xmax: 30, ymax: 20}, 4);
