import { Matrix3 } from '/src/math/matrix3.js';
import { buildDetail } from '/src/geometry/detail.js';
import { DEFAULT_PARAMS, validateParams } from '/src/geometry/detailParams.js';
import { gridLines, axisX, axisY } from '/src/geometry/grid.js';
import { transformPolyline } from '/src/geometry/shapes.js';
import { Renderer } from './renderer.js';

const GRID_SIZE = 200;      // мм
const GRID_STEP = 10;       // мм
const PLACE = { x: 30, y: 80 }; // де стоїть центр дуги R1 на сітці

/** Поля панелі: [id, підпис, значення за замовчуванням, крок]. */
const FIELDS = {
  geom: [['L', 'L — загальна довжина', DEFAULT_PARAMS.L, 1], ['B', 'B — ширина стояка', DEFAULT_PARAMS.B, 1],
    ['H', 'H — висота стояка', DEFAULT_PARAMS.H, 1], ['R1', 'R1 — зовнішній радіус', DEFAULT_PARAMS.R1, 1],
    ['R2', 'R2 — радіус отвору', DEFAULT_PARAMS.R2, 1], ['S', 'S — ширина ребра', DEFAULT_PARAMS.S, 1],
    ['T', 'T — прихована лінія', DEFAULT_PARAMS.T, 1]],
  move: [['dx', 'dx', 0, 1], ['dy', 'dy', 0, 1]],
  rot: [['rotX', 'x центру', 80, 1], ['rotY', 'y центру', 80, 1], ['angle', 'кут, °', 0, 5]],
  scale: [['kx', 'kx', 1, 0.1], ['ky', 'ky', 1, 0.1], ['scaleX', 'x центру', 80, 1], ['scaleY', 'y центру', 80, 1]],
  sym: [['symX', 'x центру', 80, 1], ['symY', 'y центру', 80, 1]],
  aff: [['aXx', 'Xx', 1, 0.1], ['aXy', 'Xy', 0, 0.1], ['aYx', 'Yx', 0, 0.1], ['aYy', 'Yy', 1, 0.1],
    ['aOx', '0x', 0, 1], ['aOy', '0y', 0, 1]],
  proj: [['pXx', 'Xx', 250, 10], ['pXy', 'Xy', 0, 10], ['pWx', 'wX', 4, 0.5],
    ['pYx', 'Yx', 0, 10], ['pYy', 'Yy', 250, 10], ['pWy', 'wY', 1, 0.5],
    ['pOx', '0x', 0, 10], ['pOy', '0y', 0, 10], ['pW0', 'w0', 500, 10]],
};

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const renderer = new Renderer(canvas);
let lastValid = { ...DEFAULT_PARAMS };
let animation = null;

// ---------------------------------------------------------------- побудова панелі

for (const [group, fields] of Object.entries(FIELDS)) {
  const container = $(`f-${group}`);
  for (const [id, label, value, step] of fields) {
    const wrap = document.createElement('label');
    wrap.className = 'f';
    wrap.innerHTML = `<span>${label}</span><input type="number" id="${id}" value="${value}" step="${step}">`;
    container.append(wrap);
  }
}

const num = (id) => {
  const v = parseFloat($(id).value);
  return Number.isFinite(v) ? v : 0;
};
const coordinateMode = () => document.querySelector('input[name=cs]:checked').value;

function resetGroup(group) {
  for (const [id, , value] of FIELDS[group]) $(id).value = value;
  if (group === 'sym') $('symOn').checked = false;
  if (group === 'rot') stopAnimation();
}

// ---------------------------------------------------------------- матриці

/** Рух деталі: масштаб → симетрія → обертання → зсув. */
function detailMatrix() {
  let m = Matrix3.scaling(num('kx'), num('ky'), num('scaleX'), num('scaleY'));
  if ($('symOn').checked) m = m.multiply(Matrix3.pointSymmetry(num('symX'), num('symY')));
  m = m.multiply(Matrix3.rotation(num('angle'), num('rotX'), num('rotY')));
  return m.multiply(Matrix3.translation(num('dx'), num('dy')));
}

function coordinateSystemMatrix() {
  switch (coordinateMode()) {
    case 'affine':
      return Matrix3.affine(num('aXx'), num('aXy'), num('aYx'), num('aYy'), num('aOx'), num('aOy'));
    case 'projective':
      return Matrix3.projective(num('pXx'), num('pXy'), num('pWx'),
        num('pYx'), num('pYy'), num('pWy'),
        num('pOx'), num('pOy'), num('pW0'));
    default:
      return Matrix3.identity();
  }
}

// ---------------------------------------------------------------- малювання

function redraw() {
  if (!renderer.fitted) renderer.fit(GRID_SIZE);
  const mode = coordinateMode();
  $('box-aff').disabled = mode !== 'affine';
  $('box-proj').disabled = mode !== 'projective';

  const cs = coordinateSystemMatrix();
  const dm = detailMatrix();
  const total = dm.multiply(cs); // спочатку рух деталі, потім система координат

  const params = Object.fromEntries(FIELDS.geom.map(([id]) => [id, num(id)]));
  const error = validateParams(params);
  $('error').textContent = error ?? '';
  if (!error) lastValid = params;

  renderer.clear();

  // 1. Сітка й осі — тільки через систему координат
  for (const line of gridLines(GRID_SIZE, GRID_STEP)) renderer.stroke(transformPolyline(line, cs));
  const ax = transformPolyline(axisX(GRID_SIZE), cs);
  const ay = transformPolyline(axisY(GRID_SIZE), cs);
  renderer.stroke(ax);
  renderer.stroke(ay);
  renderer.arrow(ax, 'X');
  renderer.arrow(ay, 'Y');
  for (let t = 0; t <= GRID_SIZE; t += 50) {
    renderer.label(cs.apply({ x: t, y: 0 }), String(t), -6, 15);
    if (t > 0) renderer.label(cs.apply({ x: 0, y: t }), String(t), -28, 4);
  }

  // 2. Деталь — через рух деталі й систему координат
  for (const part of buildDetail(lastValid, PLACE.x, PLACE.y)) renderer.stroke(transformPolyline(part, total));

  // 3. Центри обертання й симетрії
  renderer.marker(cs.apply({ x: num('rotX'), y: num('rotY') }), '--rot', 'O');
  if ($('symOn').checked) renderer.marker(cs.apply({ x: num('symX'), y: num('symY') }), '--sym', 'S');

  let text = "[x' y' w] = [x y 1] · M\n\n" + dm.format('M — рух деталі');
  if (mode === 'affine') text += '\n' + cs.format('A — афінна система');
  if (mode === 'projective') text += '\n' + cs.format('P — проективна система');
  $('matrices').textContent = text;
}

// ---------------------------------------------------------------- анімація

function stopAnimation() {
  if (!animation) return;
  cancelAnimationFrame(animation);
  animation = null;
  $('animate').textContent = 'Запустити обертання';
}

$('animate').addEventListener('click', () => {
  if (animation) {
    stopAnimation();
    return;
  }
  $('animate').textContent = 'Зупинити обертання';
  const step = () => {
    $('angle').value = (num('angle') + 1) % 360;
    redraw();
    animation = requestAnimationFrame(step);
  };
  animation = requestAnimationFrame(step);
});

// ---------------------------------------------------------------- події

document.querySelector('.panel').addEventListener('input', redraw);
document.querySelectorAll('[data-reset]').forEach((btn) => btn.addEventListener('click', () => {
  resetGroup(btn.dataset.reset);
  redraw();
}));
$('preset-aff').addEventListener('click', () => {
  // пропорції з прикладу методички: X = (20, 10), Y = (0, 10)
  Object.entries({ aXx: 1, aXy: 0.5, aYx: 0, aYy: 0.5, aOx: 0, aOy: 0 }).forEach(([k, v]) => { $(k).value = v; });
  redraw();
});
$('reset-all').addEventListener('click', () => {
  Object.keys(FIELDS).forEach(resetGroup);
  document.querySelector('input[name=cs][value=cartesian]').checked = true;
  renderer.fit(GRID_SIZE);
  redraw();
});
$('fit').addEventListener('click', () => {
  renderer.fit(GRID_SIZE);
  redraw();
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  renderer.zoom(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY);
  redraw();
}, { passive: false });

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('drag');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  renderer.pan(e.clientX - drag.x, e.clientY - drag.y);
  drag = { x: e.clientX, y: e.clientY };
  redraw();
});
const endDrag = () => {
  drag = null;
  canvas.classList.remove('drag');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

new ResizeObserver(() => {
  renderer.resize();
  redraw();
}).observe(canvas);
