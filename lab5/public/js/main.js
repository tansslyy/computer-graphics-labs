import { DEFAULT_PARAMS } from './model/diamond.js';
import { ISO, distortion } from './math/projection.js';
import { computeScene, projectPoint } from './render/scene.js';
import { drawMain, drawSide, makeViewport } from './render/renderer.js';

const PARAMS = [
  { key: 'n', label: 'Граней n', min: 5, max: 24, step: 1 },
  { key: 'radius', label: 'Радіус', min: 10, max: 100, step: 1 },
  { key: 'table', label: 'Майданчик', min: 0.2, max: 0.9, step: 0.01 },
  { key: 'crown', label: 'Коронка', min: 0, max: 60, step: 1 },
  { key: 'pavilion', label: 'Павільйон', min: 5, max: 120, step: 1 },
  { key: 'scale', label: 'Масштаб', min: 0.2, max: 3, step: 0.05 },
];

const PRESETS = {
  iso: { psi: ISO.psi, phi: ISO.phi },
  front: { psi: 0, phi: 0 },
  top: { psi: 0, phi: 90 },
  left: { psi: 90, phi: 0 },
};

const ANIM_PARAMS = {
  pavilion: { label: 'Глибина павільйону', min: 25, max: 90, step: 0.8 },
  crown: { label: 'Висота коронки', min: 5, max: 40, step: 0.4 },
  radius: { label: 'Радіус', min: 30, max: 70, step: 0.5 },
  scale: { label: 'Масштаб', min: 0.6, max: 1.6, step: 0.01 },
};

function defaultState() {
  return {
    params: { ...DEFAULT_PARAMS },
    transform: { dx: 0, dy: 0, dz: 0, ax: 0, ay: 0, az: 0 },
    proj: { ...PRESETS.iso, p: 0 },
    show: { mode: 'faces', axes: true, grid: true, ownAxes: true, side: true },
    anim: { param: 'pavilion', ...ANIM_PARAMS.pavilion, dx: 0, dy: 0, dz: 0, ax: 0, ay: 0, az: 1.5, playing: false, dir: 1, snapshot: null },
    view: { scale: 2.5, offsetX: 0, offsetY: 0 },
  };
}

let state = defaultState();
const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext('2d');
const side = $('side');
const sctx = side.getContext('2d');
const f = (v, d = 2) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(d);
let dirty = true;
const redraw = () => (dirty = true);

function fit(cv, c) {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth: w, clientHeight: h } = cv;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

function render() {
  const scene = computeScene(state);
  const { w, h } = fit(canvas, ctx);
  drawMain(ctx, makeViewport(w, h, state.view), state, scene);
  side.hidden = !state.show.side;
  if (state.show.side) {
    const s = fit(side, sctx);
    drawSide(sctx, s.w, s.h, state, scene);
  }
  updatePanel(scene);
}

function fitView() {
  const { w, h } = fit(canvas, ctx);
  const scene = computeScene(state);
  const pts = [...scene.projected];
  for (const q of [{ x: 160, y: 0, z: 0 }, { x: 0, y: 160, z: 0 }, { x: 0, y: 0, z: 160 }, { x: 0, y: 0, z: 0 }]) pts.push(projectPoint(state, q));
  const xs = pts.map((q) => q.x);
  const zs = pts.map((q) => q.z);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const scale = Math.min((w - 120) / (x1 - x0 || 1), (h - 200) / (z1 - z0 || 1));
  state.view = { scale, offsetX: -((x0 + x1) / 2) * scale, offsetY: 30 + ((z0 + z1) / 2) * scale };
  redraw();
}

// ---------------- анімація ----------------

function step() {
  const a = state.anim;
  let v = state.params[a.param] + a.dir * a.step;
  if (v >= a.max) [v, a.dir] = [a.max, -1];
  if (v <= a.min) [v, a.dir] = [a.min, 1];
  state.params[a.param] = v;
  const t = state.transform;
  t.dx += a.dir * a.dx;
  t.dy += a.dir * a.dy;
  t.dz += a.dir * a.dz;
  t.ax = (t.ax + a.ax) % 360;
  t.ay = (t.ay + a.ay) % 360;
  t.az = (t.az + a.az) % 360;
}

function loop() {
  if (state.anim.playing) {
    step();
    syncInputs();
    dirty = true;
  }
  if (dirty) {
    render();
    dirty = false;
  }
  requestAnimationFrame(loop);
}

// ---------------- панель ----------------

function buildParamInputs() {
  $('params').innerHTML = PARAMS.map(
    (p) => `<label class="row"><span>${p.label}</span>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" data-param-range="${p.key}">
      <input type="number" min="${p.min}" max="${p.max}" step="${p.step}" data-param-num="${p.key}"></label>`,
  ).join('');
  $('anim-param').innerHTML = Object.entries(ANIM_PARAMS)
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
    .join('');
}

const matrixHtml = (M) => M.map((r) => `<tr>${r.map((v) => `<td>${f(v, 3)}</td>`).join('')}</tr>`).join('');

function updatePanel(scene) {
  const d = distortion(scene.P);
  $('kind').textContent = `ψ = ${f(state.proj.psi, 2)}°, φ = ${f(state.proj.phi, 2)}°, p = ${f(state.proj.p, 0)} → ${d.kind}`;
  $('dist-info').innerHTML = [
    ['Спотворення по X', f(d.f[0], 3)],
    ['Спотворення по Y', f(d.f[1], 3)],
    ['Спотворення по Z', f(d.f[2], 3)],
    ['Вид проекції', d.kind],
  ]
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join('');
  const c = scene.center;
  $('center-info').textContent = `Центр обертання (власна вісь): (${f(c.x, 1)}; ${f(c.y, 1)}; ${f(c.z, 1)})`;
  $('w-matrix').innerHTML = matrixHtml(scene.W);
  $('p-matrix').innerHTML = matrixHtml(scene.P);
}

function syncInputs() {
  const active = document.activeElement;
  const set = (el, v, d = 2) => el !== active && (el.value = Number(Number(v).toFixed(d)));
  document.querySelectorAll('[data-param-range]').forEach((el) => (el.value = state.params[el.dataset.paramRange]));
  document.querySelectorAll('[data-param-num]').forEach((el) => set(el, state.params[el.dataset.paramNum]));
  document.querySelectorAll('[data-tr]').forEach((el) => set(el, state.transform[el.dataset.tr], 1));
  document.querySelectorAll('[data-anim]').forEach((el) => set(el, state.anim[el.dataset.anim]));
  document.querySelectorAll('[data-proj-range]').forEach((el) => (el.value = state.proj[el.dataset.projRange]));
  document.querySelectorAll('[data-proj-num]').forEach((el) => set(el, state.proj[el.dataset.projNum], 3));
  document.querySelectorAll('[data-show]').forEach((el) => (el.checked = state.show[el.dataset.show]));
  $('mode').value = state.show.mode;
  $('anim-param').value = state.anim.param;
  $('anim-play').textContent = state.anim.playing ? 'Стоп' : 'Старт';
  $('anim-play').setAttribute('aria-pressed', state.anim.playing);
}

// ---------------- керування ----------------

buildParamInputs();

const num = (el) => parseFloat(el.value);
const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, () => fn(el)));

function setParam(key, v) {
  if (!Number.isFinite(v)) return;
  const spec = PARAMS.find((p) => p.key === key);
  v = Math.min(spec.max, Math.max(spec.min, v));
  state.params[key] = key === 'n' ? Math.round(v) : v;
  syncInputs();
  redraw();
}
on('[data-param-range]', 'input', (el) => setParam(el.dataset.paramRange, num(el)));
on('[data-param-num]', 'change', (el) => setParam(el.dataset.paramNum, num(el)));

on('[data-tr]', 'input', (el) => {
  if (Number.isFinite(num(el))) {
    state.transform[el.dataset.tr] = num(el);
    redraw();
  }
});
$('tr-example').addEventListener('click', () => {
  Object.assign(state.transform, { dx: 100, dy: 100, dz: 0, ax: 0, ay: 90, az: 0 });
  syncInputs();
  redraw();
});
$('tr-reset').addEventListener('click', () => {
  state.transform = defaultState().transform;
  syncInputs();
  redraw();
});

on('[data-anim]', 'input', (el) => {
  if (Number.isFinite(num(el))) state.anim[el.dataset.anim] = num(el);
});
$('anim-param').addEventListener('change', (e) => {
  Object.assign(state.anim, { param: e.target.value, ...ANIM_PARAMS[e.target.value] });
  syncInputs();
});
$('anim-play').addEventListener('click', () => {
  const a = state.anim;
  if (!a.playing && !a.snapshot) a.snapshot = { params: { ...state.params }, transform: { ...state.transform } };
  a.playing = !a.playing;
  syncInputs();
});
$('anim-reset').addEventListener('click', () => {
  const a = state.anim;
  a.playing = false;
  if (a.snapshot) {
    state.params = { ...a.snapshot.params };
    state.transform = { ...a.snapshot.transform };
    a.snapshot = null;
  }
  a.dir = 1;
  syncInputs();
  redraw();
});

function setProj(key, v) {
  if (!Number.isFinite(v)) return;
  state.proj[key] = v;
  syncInputs();
  redraw();
}
on('[data-proj-range]', 'input', (el) => setProj(el.dataset.projRange, num(el)));
on('[data-proj-num]', 'change', (el) => setProj(el.dataset.projNum, num(el)));
on('[data-preset]', 'click', (el) => {
  Object.assign(state.proj, PRESETS[el.dataset.preset]);
  syncInputs();
  fitView();
});

on('[data-show]', 'change', (el) => {
  state.show[el.dataset.show] = el.checked;
  redraw();
});
$('mode').addEventListener('change', (e) => {
  state.show.mode = e.target.value;
  redraw();
});

$('reset-view').addEventListener('click', fitView);
$('reset-all').addEventListener('click', () => {
  state = defaultState();
  syncInputs();
  fitView();
});

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, ox: state.view.offsetX, oy: state.view.offsetY };
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  state.view.offsetX = drag.ox + e.clientX - drag.x;
  state.view.offsetY = drag.oy + e.clientY - drag.y;
  redraw();
});
const endDrag = () => {
  drag = null;
  canvas.classList.remove('dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left - r.width / 2;
    const my = e.clientY - r.top - r.height / 2;
    const scale = Math.min(40, Math.max(0.3, state.view.scale * Math.exp(-e.deltaY * 0.0015)));
    const k = scale / state.view.scale;
    state.view.offsetX = mx - (mx - state.view.offsetX) * k;
    state.view.offsetY = my - (my - state.view.offsetY) * k;
    state.view.scale = scale;
    redraw();
  },
  { passive: false },
);
window.addEventListener('resize', redraw);

syncInputs();
fitView();
requestAnimationFrame(loop);
