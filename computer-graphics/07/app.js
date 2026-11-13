const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const scale = 10;

// Исходный многоугольник (квадрат 4х4)
const originalPolygon = [
  { x: 5, y: 5 },
  { x: 9, y: 5 },
  { x: 9, y: 9 },
  { x: 5, y: 9 }
];

let transformedPolygon = [...originalPolygon];
let currentMatrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

// 1. МАТРИЦЫ ПРЕОБРАЗОВАНИЙ

function translation(tx, ty) {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1]
  ];
}

function scaling(sx, sy) {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ];
}

function rotation(degrees) {
  const rad = degrees * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    [c, -s, 0],
    [s,  c, 0],
    [0,  0, 1]
  ];
}

// Умножение матриц 3x3
function multiplyMatrices(a, b) {
  const result = [[0,0,0], [0,0,0], [0,0,1]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

// Применение матрицы к точке
function transformPoint(m, p) {
  return {
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2]
  };
}


// 2. ЛОГИКА ПОСТРОЕНИЯ

function applyTransform() {
  const tx = parseFloat(document.querySelector('#tx').value);
  const ty = parseFloat(document.querySelector('#ty').value);
  const sx = parseFloat(document.querySelector('#sx').value);
  const sy = parseFloat(document.querySelector('#sy').value);
  const angle = parseFloat(document.querySelector('#angle').value);
  const cx = parseFloat(document.querySelector('#cx').value);
  const cy = parseFloat(document.querySelector('#cy').value);
  const order = document.querySelector('input[name="order"]:checked').value;

  // Матрица поворота вокруг центра (cx, cy)
  const T_c = translation(cx, cy);
  const T_c_inv = translation(-cx, -cy);
  const R = rotation(angle);
  const S = scaling(sx, sy);

  // Матрица поворота и масштаба вокруг центра C:
  // M = T(cx, cy) * R * S * T(-cx, -cy)
  const rotateAndScale = multiplyMatrices(T_c, multiplyMatrices(R, multiplyMatrices(S, T_c_inv)));

  // Матрица переноса
  const T = translation(tx, ty);

  if (order === 'TR') {
    // Сначала R/S (вокруг центра), потом T: M = T * R * S
    currentMatrix = multiplyMatrices(T, rotateAndScale);
  } else {
    // Сначала T, потом R/S (вокруг центра): M = R * S * T
    currentMatrix = multiplyMatrices(rotateAndScale, T);
  }

  // Применяем к исходным точкам (не к результату предыдущего шага!)
  transformedPolygon = originalPolygon.map(p => transformPoint(currentMatrix, p));
  
  render();
  updateTables();
}

function resetTransform() {
  transformedPolygon = [...originalPolygon];
  currentMatrix = [[1,0,0], [0,1,0], [0,0,1]];
  render();
  updateTables();
}


// 3. ОТРИСОВКА

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

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Сетка
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 60; i++) { ctx.beginPath(); ctx.moveTo(i*scale, 0); ctx.lineTo(i*scale, 450); ctx.stroke(); }
  for (let i = 0; i <= 45; i++) { ctx.beginPath(); ctx.moveTo(0, i*scale); ctx.lineTo(600, i*scale); ctx.stroke(); }

  // Центр преобразования (красная точка)
  const cx = parseFloat(document.querySelector('#cx').value);
  const cy = parseFloat(document.querySelector('#cy').value);
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(cx * scale, cy * scale, 5, 0, Math.PI * 2);
  ctx.fill();

  // Исходная фигура (серая)
  drawPolygon(originalPolygon, '#ccc', 2);

  // Преобразованная фигура (синяя)
  drawPolygon(transformedPolygon, 'blue', 3);
}


// 4. ОБНОВЛЕНИЕ ТАБЛИЦ

function updateTables() {
  // Матрица
  const mTable = document.querySelector('#matrixTable');
  mTable.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const tr = document.createElement('tr');
    for (let j = 0; j < 3; j++) {
      const td = document.createElement('td');
      td.textContent = currentMatrix[i][j].toFixed(3);
      tr.appendChild(td);
    }
    mTable.appendChild(tr);
  }

  // Вершины
  const pointsBody = document.querySelector('#pointsBody');
  pointsBody.innerHTML = '';
  originalPolygon.forEach((p, i) => {
    const tp = transformedPolygon[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>P${i}</td>
      <td>${p.x.toFixed(1)}</td>
      <td>${p.y.toFixed(1)}</td>
      <td>${tp.x.toFixed(2)}</td>
      <td>${tp.y.toFixed(2)}</td>
    `;
    pointsBody.appendChild(tr);
  });
}


// 5. СОБЫТИЯ И ЗАПУСК

document.querySelector('#applyBtn').addEventListener('click', applyTransform);
document.querySelector('#resetBtn').addEventListener('click', resetTransform);

// Перерисовывать при смене центра
document.querySelector('#cx').addEventListener('input', render);
document.querySelector('#cy').addEventListener('input', render);

render();
updateTables();
