const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// 1. ГЕОМЕТРИЯ

const models = {
  cube: {
    vertices: [
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },  { x: 1, y: 1, z: 1 },  { x: -1, y: 1, z: 1 }
    ],
    edges: [
      [0,1], [1,2], [2,3], [3,0],
      [4,5], [5,6], [6,7], [7,4],
      [0,4], [1,5], [2,6], [3,7]
    ]
  },
  pyramid: {
    vertices: [
      { x: 0, y: 1.5, z: 0 }, // Вершина
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: -1, z: 1 }, { x: -1, y: -1, z: 1 } // Основание
    ],
    edges: [
      [0,1], [0,2], [0,3], [0,4],
      [1,2], [2,3], [3,4], [4,1]
    ]
  }
};

let currentModelKey = 'cube';

// 2. МАТЕМАТИКА (4x4)

const translation3D = (tx, ty, tz) => [
  [1, 0, 0, tx], [0, 1, 0, ty], [0, 0, 1, tz], [0, 0, 0, 1]
];

const scaling3D = (sx, sy, sz) => [
  [sx, 0, 0, 0], [0, sy, 0, 0], [0, 0, sz, 0], [0, 0, 0, 1]
];

const rotationX = (deg) => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]];
};

const rotationY = (deg) => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]];
};

const rotationZ = (deg) => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
};

function multiply4(a, b) {
  const res = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        res[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return res;
}

function transform3D(m, p) {
  const v = [p.x, p.y, p.z, 1];
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      r[i] += m[i][j] * v[j];
    }
  }
  return { x: r[0], y: r[1], z: r[2] };
}

// 3. ПРОЕКЦИИ И ОТСЕЧЕНИЕ

const near = 0.1;

function projectOrtho(p) {
  return {
    x: canvas.width / 2 + p.x * 150,
    y: canvas.height / 2 - p.y * 150
  };
}

function projectPerspective(p, focal = 300) {
  if (p.z <= near) return null; // За ближней плоскостью
  return {
    x: canvas.width / 2 + (focal * p.x) / p.z,
    y: canvas.height / 2 - (focal * p.y) / p.z
  };
}

// Отсечение ребра по ближней плоскости
function clipEdgeNear(a, b) {
  const inA = a.z >= near;
  const inB = b.z >= near;

  if (!inA && !inB) return null;
  if (inA && inB) return [a, b];

  const t = (near - a.z) / (b.z - a.z);
  const cut = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: near
  };

  return inA ? [a, cut] : [cut, b];
}

// 4. ЛОГИКА И ОТРИСОВКА

let angleYAnim = 0;
let isPlaying = false;
let lastTime = 0;

function getParams() {
  return {
    ax: parseFloat(document.querySelector('#angleX').value),
    ay: parseFloat(document.querySelector('#angleY').value) + angleYAnim,
    az: parseFloat(document.querySelector('#angleZ').value),
    scale: parseFloat(document.querySelector('#scale').value),
    tz: parseFloat(document.querySelector('#tz').value),
    proj: document.querySelector('#projection').value
  };
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const p = getParams();
  const model = models[currentModelKey];

  // Матрица модели: T * Rz * Ry * Rx * S
  const M = multiply4(
    translation3D(0, 0, p.tz),
    multiply4(rotationZ(p.az), multiply4(rotationY(p.ay), multiply4(rotationX(p.ax), scaling3D(p.scale, p.scale, p.scale))))
  );

  // Преобразуем все вершины
  const worldPoints = model.vertices.map(v => transform3D(M, v));

  // Рисуем рёбра
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (const [i, j] of model.edges) {
    const clipped = clipEdgeNear(worldPoints[i], worldPoints[j]);
    if (!clipped) continue;

    const [a, b] = clipped;
    const pa = p.proj === 'ortho' ? projectOrtho(a) : projectPerspective(a);
    const pb = p.proj === 'ortho' ? projectOrtho(b) : projectPerspective(b);

    if (!pa || !pb) continue;
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();

  // Вывод информации о P0
  const origP0 = model.vertices[0];
  const worldP0 = worldPoints[0];
  const screenP0 = p.proj === 'ortho' ? projectOrtho(worldP0) : projectPerspective(worldP0);

  document.querySelector('#posOrig').textContent = `(${origP0.x}, ${origP0.y}, ${origP0.z})`;
  document.querySelector('#posWorld').textContent = `(${worldP0.x.toFixed(2)}, ${worldP0.y.toFixed(2)}, ${worldP0.z.toFixed(2)})`;
  document.querySelector('#posScreen').textContent = screenP0 ? `(${screenP0.x.toFixed(0)}, ${screenP0.y.toFixed(0)})` : 'невидима';
}

function animate(time) {
  if (isPlaying) {
    if (lastTime !== 0) {
      const dt = (time - lastTime) / 1000;
      angleYAnim += 45 * dt; // 45 градусов в секунду
      drawScene();
    }
    lastTime = time;
    requestAnimationFrame(animate);
  }
}

// 5. СОБЫТИЯ

// Слайдеры
['angleX', 'angleY', 'angleZ'].forEach(id => {
  document.querySelector(`#${id}`).addEventListener('input', (e) => {
    document.querySelector(`#val${id.replace('angle', '')}`).textContent = e.target.value + '°';
    if (!isPlaying) drawScene();
  });
});

['scale', 'tz', 'projection', 'model'].forEach(id => {
  document.querySelector(`#${id}`).addEventListener('input', () => {
    if (id === 'model') currentModelKey = document.querySelector('#model').value;
    if (!isPlaying) drawScene();
  });
});

// Анимация
document.querySelector('#playBtn').addEventListener('click', () => {
  isPlaying = !isPlaying;
  document.querySelector('#playBtn').textContent = isPlaying ? '⏸ Пауза' : '▶ Вращать';
  if (isPlaying) {
    lastTime = 0;
    requestAnimationFrame(animate);
  }
});

// Сброс
document.querySelector('#resetBtn').addEventListener('click', () => {
  isPlaying = false;
  document.querySelector('#playBtn').textContent = '▶ Вращать';
  angleYAnim = 0;
  
  document.querySelector('#angleX').value = 30; document.querySelector('#valX').textContent = '30°';
  document.querySelector('#angleY').value = -45; document.querySelector('#valY').textContent = '-45°';
  document.querySelector('#angleZ').value = 0; document.querySelector('#valZ').textContent = '0°';
  document.querySelector('#scale').value = 1.5;
  document.querySelector('#tz').value = 6;
  document.querySelector('#projection').value = 'perspective';
  document.querySelector('#model').value = 'cube';
  currentModelKey = 'cube';
  
  drawScene();
});

// Старт
drawScene();
