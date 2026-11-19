import { LongchampsTrisectrix } from './math/trisectrix.js';
import { sceneMatrix } from './math/matrix.js';
import { drawScene, makeViewport } from './render/renderer.js';
import { defaultState, LIMITS } from './core/state.js';
import { Animator } from './core/animation.js';
import { analyse, f } from './core/analysis.js';

const state = defaultState();
const curve = new LongchampsTrisectrix(state.a);
const animator = new Animator();

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

// ---------------- малювання ----------------

let dirty = true;
const requestRedraw = () => (dirty = true);

function render() {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth: w, clientHeight: h } = canvas;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  curve.a = state.a;
  const M = sceneMatrix(state.transform);
  drawScene(ctx, makeViewport(w, h, state.view), state, curve, M);
  showResults(analyse(curve, state, M));
}

function loop() {
  if (animator.step(state)) {
    syncInputs();
    dirty = true;
  }
  if (dirty) {
    render();
    dirty = false;
  }
  requestAnimationFrame(loop);
}

// ---------------- панель результатів ----------------

function showResults(info) {
  const rows = [];
  const group = (title) => rows.push(`<dt class="group">${title}</dt>`);
  const row = (k, v) => rows.push(`<dt>${k}</dt><dd>${v}</dd>`);

  group('Асимптоти (у локальних координатах)');
  info.asymptotes.forEach((eq, i) => row(`${i + 1}`, eq));
  row('Площа трикутника', `${f(info.triangleArea.analytic)} <small>(a²/√3)</small>`);
  row('— за Гауссом', f(info.triangleArea.numeric));
  row('Площа між гілкою й асимптотами', `${f(info.branchArea.analytic)} <small>(a²/(3√3))</small>`);
  row('— чисельно', f(info.branchArea.numeric));

  group('Точки перегину');
  row('Знайдено', info.inflections === 0 ? 'немає' : info.inflections);
  row('Мін. радіус кривини', `${f(info.minRadius)} <small>(a/8, у вершинах)</small>`);

  group('Точка P');
  if (!info.point) {
    row('Стан', 'розрив — точка у нескінченності');
  } else {
    const p = info.point;
    row('Гілка', p.branch);
    row('P (локально)', `(${f(p.local.x, 3)}; ${f(p.local.y, 3)})`);
    row('P (на сцені)', `(${f(p.world.x, 3)}; ${f(p.world.y, 3)})`);
    row('Дотична', p.tangent);
    row('Нормаль', p.normal);
    row('Радіус кривини', `${f(p.radius)}`);
    row('— за формулою k(x′, y′, x″, y″)', f(p.radiusNumeric));
    row('Довжина дуги від вершини', f(p.arcLength));
    row('Площа сектора', `${f(p.sector.analytic)} <small>/ ${f(p.sector.numeric)}</small>`);
    row('Площа сегмента', `${f(p.segment.analytic)} <small>/ ${f(p.segment.numeric)}</small>`);
  }
  $('results').innerHTML = rows.join('');

  $('matrix').innerHTML = info.matrix
    .map((r) => `<tr>${r.map((v) => `<td>${f(v, 3)}</td>`).join('')}</tr>`)
    .join('');

  const note = $('phi-note');
  if (info.point) {
    note.textContent = '';
    note.classList.remove('warn');
  } else {
    note.textContent = 'При φ = ±30°, ±90° крива йде в нескінченність. Зсуньте повзунок.';
    note.classList.add('warn');
  }
}

// ---------------- елементи керування ----------------

function bindPair(rangeId, numId, key, limits) {
  const range = $(rangeId);
  const num = $(numId);
  const set = (v) => {
    if (!Number.isFinite(v)) return;
    state[key] = Math.min(limits.max, Math.max(limits.min, v));
    syncInputs();
    requestRedraw();
  };
  range.addEventListener('input', () => set(parseFloat(range.value)));
  num.addEventListener('change', () => set(parseFloat(num.value)));
}

function syncInputs() {
  $('a-range').value = state.a;
  if (document.activeElement !== $('a-num')) $('a-num').value = state.a.toFixed(2);
  $('phi-range').value = state.phiDeg;
  if (document.activeElement !== $('phi-num')) $('phi-num').value = state.phiDeg.toFixed(1);
  $('speed').value = state.animation.speed;
  $('speed-out').textContent = `×${state.animation.speed}`;
  $('anim-a').setAttribute('aria-pressed', state.animation.a);
  $('anim-point').setAttribute('aria-pressed', state.animation.point);
  document.querySelectorAll('[data-show]').forEach((el) => (el.checked = state.show[el.dataset.show]));
  document.querySelectorAll('[data-tr]').forEach((el) => {
    if (document.activeElement !== el) el.value = state.transform[el.dataset.tr];
  });
}

bindPair('a-range', 'a-num', 'a', LIMITS.a);
bindPair('phi-range', 'phi-num', 'phiDeg', LIMITS.phiDeg);

document.querySelectorAll('[data-show]').forEach((el) =>
  el.addEventListener('change', () => {
    state.show[el.dataset.show] = el.checked;
    requestRedraw();
  }),
);

document.querySelectorAll('[data-tr]').forEach((el) =>
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    if (Number.isFinite(v)) {
      state.transform[el.dataset.tr] = v;
      requestRedraw();
    }
  }),
);

$('anim-a').addEventListener('click', () => {
  state.animation.a = !state.animation.a;
  syncInputs();
});
$('anim-point').addEventListener('click', () => {
  state.animation.point = !state.animation.point;
  syncInputs();
});
$('speed').addEventListener('input', (e) => {
  state.animation.speed = parseFloat(e.target.value);
  syncInputs();
});

$('reset-view').addEventListener('click', () => {
  Object.assign(state.view, defaultState().view);
  requestRedraw();
});
$('reset-all').addEventListener('click', () => {
  Object.assign(state, defaultState());
  syncInputs();
  requestRedraw();
});

// ---------------- масштаб і зсув виду мишею ----------------

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left - rect.width / 2;
  const my = e.clientY - rect.top - rect.height / 2;
  const k = Math.exp(-e.deltaY * 0.0015);
  const newScale = Math.min(400, Math.max(4, state.view.scale * k));
  const r = newScale / state.view.scale;
  // точка під курсором лишається на місці
  state.view.offsetX = mx - (mx - state.view.offsetX) * r;
  state.view.offsetY = my - (my - state.view.offsetY) * r;
  state.view.scale = newScale;
  requestRedraw();
}, { passive: false });

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, ox: state.view.offsetX, oy: state.view.offsetY };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  state.view.offsetX = drag.ox + e.clientX - drag.x;
  state.view.offsetY = drag.oy + e.clientY - drag.y;
  requestRedraw();
});
const endDrag = () => {
  drag = null;
  canvas.classList.remove('dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

window.addEventListener('resize', requestRedraw);

syncInputs();
requestAnimationFrame(loop);
