import { contour27, cloneContours } from './model/contour27.js';
import { morphTarget, interpolate } from './model/morph.js';
import { hitPoint, hitSegment, movePoint, segmentOfPoint, setWeight } from './model/editor.js';
import { applyToPoint, invertAffine, sceneMatrix } from './math/matrix.js';
import { arcType, sampleContour, segmentCount } from './math/curve.js';
import { drawScene, makeViewport } from './render/renderer.js';

const ORIGINAL = contour27();
const TARGET = morphTarget(ORIGINAL);

function defaultState() {
  return {
    contours: cloneContours(ORIGINAL),
    show: { grid: true, double: true, polygon: true, points: true },
    edit: { enabled: true, smooth: true },
    morph: { t: 0, playing: false, dir: 1, speed: 1 },
    transform: { dx: 0, dy: 0, px: 0, py: 0, angleDeg: 0 },
    rotating: false,
    view: { scale: 16, offsetX: 0, offsetY: 0 },
  };
}

let state = defaultState();
const sel = { point: null, segment: null };

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

const displayed = () => (state.morph.t > 0 ? interpolate(state.contours, TARGET, state.morph.t) : state.contours);
const matrix = () => sceneMatrix(state.transform);
const f = (v, d = 2) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(d);

let dirty = true;
const redraw = () => (dirty = true);

function size() {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth: w, clientHeight: h } = canvas;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

function viewport() {
  const { w, h } = size();
  return makeViewport(w, h, state.view);
}

function render() {
  const vp = viewport();
  drawScene(ctx, vp, state, displayed(), matrix(), sel);
  updatePanel();
}

function loop() {
  let changed = false;
  if (state.morph.playing) {
    const m = state.morph;
    m.t += m.dir * 0.006 * m.speed;
    if (m.t >= 1) [m.t, m.dir] = [1, -1];
    if (m.t <= 0) [m.t, m.dir] = [0, 1];
    changed = true;
  }
  if (state.rotating) {
    state.transform.angleDeg = (state.transform.angleDeg + 0.8 * state.morph.speed) % 360;
    changed = true;
  }
  if (changed) {
    syncInputs();
    dirty = true;
  }
  if (dirty) {
    render();
    dirty = false;
  }
  requestAnimationFrame(loop);
}

function fitView() {
  const { w, h } = size();
  const M = matrix();
  const pts = displayed()
    .flatMap((c) => [...sampleContour(c, 10), ...c.ctrl])
    .map((p) => applyToPoint(M, p));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = { top: 130, bottom: 40, side: 40 };
  const scale = Math.min((w - 2 * pad.side) / (x1 - x0), (h - pad.top - pad.bottom) / (y1 - y0));
  const cy = pad.top + (h - pad.top - pad.bottom) / 2;
  state.view = {
    scale,
    offsetX: -((x0 + x1) / 2) * scale,
    offsetY: cy - h / 2 + ((y0 + y1) / 2) * scale,
  };
  redraw();
}

// ---------------- панель ----------------

function updatePanel() {
  const cs = state.contours;
  const arcs = cs.reduce((s, c) => s + segmentCount(c), 0);
  $('stats').textContent = `${cs.length} елементів · ${arcs} дуг · t = ${f(state.morph.t, 2)}`;

  const info = [];
  if (sel.segment) {
    const c = cs[sel.segment.ci];
    info.push(['Елемент', c.name], ['Дуга', `${sel.segment.k + 1} з ${segmentCount(c)}`]);
  }
  if (sel.point) {
    const c = cs[sel.point.ci];
    const p = sel.point.kind === 'node' ? c.nodes[sel.point.k] : c.ctrl[sel.point.k];
    const pw = applyToPoint(matrix(), p);
    info.push(['Точка', sel.point.kind === 'node' ? 'вузлова (A/C)' : 'реперна B']);
    info.push(['Локально', `(${f(p.x)}; ${f(p.y)})`], ['На сцені', `(${f(pw.x)}; ${f(pw.y)})`]);
  }
  $('point-info').innerHTML = info.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('edit-note').textContent = state.morph.t > 0 ? 'Під час морфінгу точки не редагуються — поверніться до t = 0.' : '';

  $('matrix').innerHTML = matrix()
    .map((r) => `<tr>${r.map((v) => `<td>${f(v, 3)}</td>`).join('')}</tr>`)
    .join('');

  const seg = sel.segment;
  document.querySelectorAll('[data-w-range],[data-w-num]').forEach((el) => (el.disabled = !seg));
  $('w-all').disabled = $('w-reset').disabled = !seg;
  if (!seg) {
    $('seg-title').textContent = 'Оберіть дугу кліком по кривій або по її точці.';
    $('arc-type').textContent = '';
    return;
  }
  const w = displayed()[seg.ci].weights[seg.k];
  $('seg-title').textContent = `${cs[seg.ci].name}, дуга ${seg.k + 1}`;
  document.querySelectorAll('[data-w-range]').forEach((el) => (el.value = w[+el.dataset.wRange]));
  document.querySelectorAll('[data-w-num]').forEach((el) => {
    if (document.activeElement !== el) el.value = f(w[+el.dataset.wNum], 3);
  });
  const t = arcType(w);
  $('arc-type').textContent = `f = ${f(t.f, 3)} → дуга: ${t.type}`;
}

function syncInputs() {
  document.querySelectorAll('[data-show]').forEach((el) => (el.checked = state.show[el.dataset.show]));
  document.querySelectorAll('[data-edit]').forEach((el) => (el.checked = state.edit[el.dataset.edit]));
  document.querySelectorAll('[data-tr]').forEach((el) => {
    if (document.activeElement !== el) el.value = Number(state.transform[el.dataset.tr].toFixed(2));
  });
  $('t-range').value = state.morph.t;
  $('t-out').textContent = f(state.morph.t, 2);
  $('speed').value = state.morph.speed;
  $('speed-out').textContent = `×${state.morph.speed}`;
  $('morph-play').setAttribute('aria-pressed', state.morph.playing);
  $('rotate-play').setAttribute('aria-pressed', state.rotating);
}

// ---------------- керування ----------------

document.querySelectorAll('[data-show]').forEach((el) =>
  el.addEventListener('change', () => {
    state.show[el.dataset.show] = el.checked;
    redraw();
  }),
);
document.querySelectorAll('[data-edit]').forEach((el) =>
  el.addEventListener('change', () => {
    state.edit[el.dataset.edit] = el.checked;
    redraw();
  }),
);

function onWeight(idx, v) {
  if (!sel.segment || !Number.isFinite(v)) return;
  if (state.morph.t > 0) return;
  setWeight(state.contours, sel.segment.ci, sel.segment.k, idx, v);
  redraw();
}
document.querySelectorAll('[data-w-range]').forEach((el) =>
  el.addEventListener('input', () => onWeight(+el.dataset.wRange, parseFloat(el.value))),
);
document.querySelectorAll('[data-w-num]').forEach((el) =>
  el.addEventListener('change', () => onWeight(+el.dataset.wNum, parseFloat(el.value))),
);
$('w-all').addEventListener('click', () => {
  if (!sel.segment) return;
  const c = state.contours[sel.segment.ci];
  const wB = c.weights[sel.segment.k][1];
  c.weights.forEach((w) => (w[1] = wB));
  redraw();
});
$('w-reset').addEventListener('click', () => {
  if (!sel.segment) return;
  const { ci } = sel.segment;
  state.contours[ci].weights = ORIGINAL[ci].weights.map((w) => [...w]);
  redraw();
});

$('t-range').addEventListener('input', (e) => {
  state.morph.t = parseFloat(e.target.value);
  state.morph.playing = false;
  syncInputs();
  redraw();
});
$('speed').addEventListener('input', (e) => {
  state.morph.speed = parseFloat(e.target.value);
  syncInputs();
});
$('morph-play').addEventListener('click', () => {
  state.morph.playing = !state.morph.playing;
  if (state.morph.playing && state.morph.t >= 1) state.morph.dir = -1;
  syncInputs();
});
$('morph-back').addEventListener('click', () => {
  Object.assign(state.morph, { t: 0, playing: false, dir: 1 });
  syncInputs();
  redraw();
});

document.querySelectorAll('[data-tr]').forEach((el) =>
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    if (Number.isFinite(v)) {
      state.transform[el.dataset.tr] = v;
      redraw();
    }
  }),
);
$('rotate-play').addEventListener('click', () => {
  state.rotating = !state.rotating;
  syncInputs();
});
$('tr-reset').addEventListener('click', () => {
  state.transform = defaultState().transform;
  state.rotating = false;
  syncInputs();
  redraw();
});

$('save').addEventListener('click', () => {
  const data = JSON.stringify({ variant: 4, contour: 27, contours: state.contours }, null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = 'contour27.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('load').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { contours } = JSON.parse(await file.text());
    const ok = contours.length === ORIGINAL.length && contours.every((c, i) => c.ctrl.length === ORIGINAL[i].ctrl.length);
    if (!ok) throw new Error('структура не відповідає контуру №27');
    state.contours = cloneContours(contours);
    sel.point = sel.segment = null;
    redraw();
  } catch (err) {
    alert(`Не вдалося відкрити файл: ${err.message}`);
  }
  e.target.value = '';
});

$('reset-view').addEventListener('click', fitView);
$('reset-all').addEventListener('click', () => {
  state = defaultState();
  sel.point = sel.segment = null;
  syncInputs();
  fitView();
});

// ---------------- миша ----------------

const mouse = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const q = mouse(e);
  const vp = viewport();
  const M = matrix();
  const toScreen = (p) => vp.toScreen(applyToPoint(M, p));
  const shown = displayed();
  canvas.setPointerCapture(e.pointerId);

  const pt = state.show.polygon && state.show.points ? hitPoint(shown, toScreen, q) : null;
  if (pt) {
    sel.point = pt;
    sel.segment = { ci: pt.ci, k: segmentOfPoint(shown[pt.ci], pt) };
    if (state.edit.enabled && state.morph.t === 0) drag = { type: 'point' };
    redraw();
    return;
  }
  const seg = hitSegment(shown, toScreen, q);
  if (seg) {
    sel.segment = seg;
    sel.point = null;
    redraw();
    return;
  }
  drag = { type: 'view', x: e.clientX, y: e.clientY, ox: state.view.offsetX, oy: state.view.offsetY };
  canvas.classList.add('dragging');
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) {
    const vp = viewport();
    const M = matrix();
    const over = state.show.polygon && state.show.points && hitPoint(displayed(), (p) => vp.toScreen(applyToPoint(M, p)), mouse(e));
    canvas.classList.toggle('over-point', Boolean(over));
    return;
  }
  if (drag.type === 'view') {
    state.view.offsetX = drag.ox + e.clientX - drag.x;
    state.view.offsetY = drag.oy + e.clientY - drag.y;
  } else {
    const local = applyToPoint(invertAffine(matrix()), viewport().toWorld(mouse(e)));
    movePoint(state.contours, sel.point, local, state.edit.smooth);
  }
  redraw();
});

const endDrag = () => {
  drag = null;
  canvas.classList.remove('dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left - r.width / 2;
  const my = e.clientY - r.top - r.height / 2;
  const k = Math.exp(-e.deltaY * 0.0015);
  const scale = Math.min(300, Math.max(2, state.view.scale * k));
  const ratio = scale / state.view.scale;
  state.view.offsetX = mx - (mx - state.view.offsetX) * ratio;
  state.view.offsetY = my - (my - state.view.offsetY) * ratio;
  state.view.scale = scale;
  redraw();
}, { passive: false });

window.addEventListener('resize', redraw);

syncInputs();
fitView();
requestAnimationFrame(loop);
