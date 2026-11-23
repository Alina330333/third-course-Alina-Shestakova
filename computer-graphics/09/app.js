// Canvas 
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Модель: куб 
// 8 вершин, координаты в мировом пространстве
const vertices = [
  [-1, -1, -1], // 0
  [ 1, -1, -1], // 1
  [ 1,  1, -1], // 2
  [-1,  1, -1], // 3
  [-1, -1,  1], // 4
  [ 1, -1,  1], // 5
  [ 1,  1,  1], // 6
  [-1,  1,  1], // 7
];

// 12 ориентированных треугольников (наружная ориентация)
const triangles = [
  // задняя грань (-Z)
  [0, 3, 2], [0, 2, 1],
  // передняя грань (+Z)
  [4, 5, 6], [4, 6, 7],
  // низ
  [0, 1, 5], [0, 5, 4],
  // верх
  [3, 7, 6], [3, 6, 2],
  // левая
  [0, 4, 7], [0, 7, 3],
  // правая
  [1, 2, 6], [1, 6, 5],
];

// Состояние 
let rotX = -20, rotY = 30, rotZ = 0;
let dist = 6;
let perspective = true;
let filled = true;
let cullBackface = true;
let color1 = [231, 76, 60];
let color2 = [52, 152, 219];

// Z-буфер и буфер кадра
let depthBuffer = new Float64Array(W * H);
let imageData = ctx.createImageData(W, H);
let pixels = imageData.data;

// Матрицы 4×4 (column-major не нужен, используем row-major) 
function mat4Identity() {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
}

function mat4Mul(a, b) {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++)
        r[i*4+j] += a[i*4+k] * b[k*4+j];
  return r;
}

function rotXMat(deg) {
  const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
  return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1];
}

function rotYMat(deg) {
  const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
  return [c,0,s,0, 0,1,0,0, -s,0,c,0, 0,0,0,1];
}

function rotZMat(deg) {
  const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
  return [c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1];
}

function translateMat(x, y, z) {
  return [1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1];
}

function transformPoint(m, p) {
  const [x, y, z] = p;
  return [
    m[0]*x + m[1]*y + m[2]*z + m[3],
    m[4]*x + m[5]*y + m[6]*z + m[7],
    m[8]*x + m[9]*y + m[10]*z + m[11],
  ];
}

// Построение модельной матрицы 
function getModelMatrix() {
  let m = mat4Identity();
  m = mat4Mul(rotXMat(rotX), m);
  m = mat4Mul(rotYMat(rotY), m);
  m = mat4Mul(rotZMat(rotZ), m);
  return m;
}

// Проекция 
const near = 0.1;

function projectPoint(p) {
  // p уже в координатах камеры (после модельной и видовой)
  let sx, sy;
  if (perspective) {
    if (p[2] <= near) return null; // за ближней плоскостью
    const f = 400; // фокусное расстояние
    sx = W / 2 + (f * p[0]) / p[2];
    sy = H / 2 - (f * p[1]) / p[2];
  } else {
    const scale = 200;
    sx = W / 2 + p[0] * scale;
    sy = H / 2 - p[1] * scale;
  }
  return { x: sx, y: sy, z: p[2] };
}

// Отсечение по near 
function cutNear(a, b) {
  const t = (near - a.z) / (b.z - a.z);
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: near,
  };
}

function clipPolygonNear(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const inA = a.z >= near;
    const inB = b.z >= near;
    if (inA && inB) out.push(b);
    else if (inA && !inB) out.push(cutNear(a, b));
    else if (!inA && inB) out.push(cutNear(a, b), b);
  }
  return out;
}

function triangulateFan(poly) {
  const tris = [];
  for (let i = 1; i + 1 < poly.length; i++) {
    tris.push([poly[0], poly[i], poly[i + 1]]);
  }
  return tris;
}

// Барицентрические координаты 
function edge(a, b, p) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function barycentric(a, b, c, p) {
  const area = edge(a, b, c);
  if (Math.abs(area) < 1e-12) return null;
  return {
    wa: edge(b, c, p) / area,
    wb: edge(c, a, p) / area,
    wc: edge(a, b, p) / area,
  };
}

function depthAt(w, a, b, c) {
  if (!perspective) {
    return w.wa * a.z + w.wb * b.z + w.wc * c.z;
  }
  // перспективно-корректная интерполяция 1/z
  const invZ = w.wa / a.z + w.wb / b.z + w.wc / c.z;
  return 1 / invZ;
}

// Растеризация 
let pixelsPassed = 0;

function rasterTriangle(a, b, c, color) {
  const left = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const right = Math.min(W - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const top = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const bottom = Math.min(H - 1, Math.ceil(Math.max(a.y, b.y, c.y)));

  const eps = 1e-9;

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const w = barycentric(a, b, c, { x: x + 0.5, y: y + 0.5 });
      if (!w) return; // вырожденный треугольник
      if (w.wa < -eps || w.wb < -eps || w.wc < -eps) continue;

      const z = depthAt(w, a, b, c);
      if (!Number.isFinite(z) || z <= 0) continue;

      const idx = y * W + x;
      if (z < depthBuffer[idx]) {
        depthBuffer[idx] = z;
        const off = idx * 4;
        pixels[off] = color[0];
        pixels[off + 1] = color[1];
        pixels[off + 2] = color[2];
        pixels[off + 3] = 255;
        pixelsPassed++;
      }
    }
  }
}

// Отсечение обратных граней 
function cross(u, v) {
  return {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function frontFacing(a, b, c) {
  // a, b, c — вершины в координатах камеры
  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const n = cross(u, v);
  // камера в начале координат, вектор к камере = -a
  return dot(n, { x: -a.x, y: -a.y, z: -a.z }) > 1e-10;
}

// Главный рендер 
function render() {
  // Очистка
  pixels.fill(0);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255; // непрозрачный чёрный фон
  depthBuffer.fill(Infinity);
  pixelsPassed = 0;

  const model = getModelMatrix();
  const view = translateMat(0, 0, dist); // камера смотрит вдоль +Z

  let triCount = 0;

  for (const tri of triangles) {
    // 1) модельная + видовая трансформация
    const camVerts = tri.map(i => {
      const wp = vertices[i];
      const mp = transformPoint(model, wp);
      return transformPoint(view, mp);
    });

    // 2) отсечение обратных граней (в координатах камеры)
    if (cullBackface && filled) {
      if (!frontFacing(camVerts[0], camVerts[1], camVerts[2])) continue;
    }

    // 3) проекция (с проверкой near)
    const proj = camVerts.map(projectPoint);
    if (proj.some(p => p === null)) {
      // если хоть одна вершина за near — отсекаем полигон
      const clipped = clipPolygonNear(camVerts.map((p, i) => ({
        x: p[0], y: p[1], z: p[2],
      })));
      if (clipped.length < 3) continue;
      const clippedProj = clipped.map(p => projectPoint([p.x, p.y, p.z]));
      if (clippedProj.some(p => p === null)) continue;
      const fan = triangulateFan(clippedProj);
      for (const t of fan) {
        triCount++;
        const color = (triCount % 2 === 0) ? color1 : color2;
        rasterTriangle(t[0], t[1], t[2], color);
      }
      continue;
    }

    // 4) обычный треугольник
    triCount++;
    const color = (triCount % 2 === 0) ? color1 : color2;
    rasterTriangle(proj[0], proj[1], proj[2], color);
  }

  // 5) вывод
  ctx.putImageData(imageData, 0, 0);

  // 6) каркасный режим поверх (для сравнения)
  if (!filled) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    const model2 = getModelMatrix();
    const view2 = translateMat(0, 0, dist);
    for (const tri of triangles) {
      const pts = tri.map(i => {
        const wp = vertices[i];
        const mp = transformPoint(model2, wp);
        const vp = transformPoint(view2, mp);
        return projectPoint(vp);
      });
      if (pts.some(p => p === null)) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  document.getElementById('triCount').textContent = triCount;
  document.getElementById('pixelCount').textContent = pixelsPassed;
}

// UI 
function bindUI() {
  document.querySelectorAll('input[name="mode"]').forEach(el => {
    el.addEventListener('change', e => {
      filled = e.target.value === 'filled';
      render();
    });
  });

  document.querySelectorAll('input[name="proj"]').forEach(el => {
    el.addEventListener('change', e => {
      perspective = e.target.value === 'persp';
      render();
    });
  });

  document.getElementById('rotX').addEventListener('input', e => {
    rotX = +e.target.value; render();
  });
  document.getElementById('rotY').addEventListener('input', e => {
    rotY = +e.target.value; render();
  });
  document.getElementById('rotZ').addEventListener('input', e => {
    rotZ = +e.target.value; render();
  });
  document.getElementById('dist').addEventListener('input', e => {
    dist = +e.target.value; render();
  });
  document.getElementById('color1').addEventListener('input', e => {
    const h = e.target.value;
    color1 = [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    render();
  });
  document.getElementById('color2').addEventListener('input', e => {
    const h = e.target.value;
    color2 = [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    render();
  });
  document.getElementById('cull').addEventListener('change', e => {
    cullBackface = e.target.checked; render();
  });
  document.getElementById('reset').addEventListener('click', () => {
    rotX = -20; rotY = 30; rotZ = 0; dist = 6;
    perspective = true; filled = true; cullBackface = true;
    document.getElementById('rotX').value = -20;
    document.getElementById('rotY').value = 30;
    document.getElementById('rotZ').value = 0;
    document.getElementById('dist').value = 6;
    document.querySelector('input[name="mode"][value="filled"]').checked = true;
    document.querySelector('input[name="proj"][value="persp"]').checked = true;
    document.getElementById('cull').checked = true;
    render();
  });
}

bindUI();
render();
