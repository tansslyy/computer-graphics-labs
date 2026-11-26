import { apply } from '../math/mat4.js';
import { projectPoint, viewPoint } from './scene.js';

export const COLORS = {
  paper: '#FAFBFC',
  grid: '#E3E8EF',
  axisX: '#D64545',
  axisY: '#2F9E5A',
  axisZ: '#2B6CB0',
  edge: '#1A2433',
  hidden: '#A0AEC0',
  center: '#D53F8C',
  plane: '#805AD5',
  ray: '#B794F4',
};

const AXIS_LEN = 160;

export function makeViewport(width, height, view) {
  const cx = width / 2 + view.offsetX;
  const cy = height / 2 + view.offsetY;
  return {
    width,
    height,
    scale: view.scale,
    toScreen: (q) => ({ x: cx + q.x * view.scale, y: cy - q.z * view.scale }),
  };
}

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function label(ctx, text, q, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(text, q.x + 5, q.y - 5);
}

export function drawMain(ctx, vp, state, scene) {
  const S = (p) => vp.toScreen(projectPoint(state, p));
  ctx.save();
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, vp.width, vp.height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (state.show.grid) drawGroundGrid(ctx, S);
  if (state.show.axes) drawAxes(ctx, S);
  drawBody(ctx, vp, state, scene);
  if (state.show.ownAxes) drawOwnAxes(ctx, state, scene, S);
  ctx.restore();
}

function drawGroundGrid(ctx, S) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let v = -150; v <= 150; v += 25) {
    line(ctx, S({ x: v, y: -150, z: 0 }), S({ x: v, y: 150, z: 0 }));
    line(ctx, S({ x: -150, y: v, z: 0 }), S({ x: 150, y: v, z: 0 }));
  }
}

function drawAxes(ctx, S) {
  const o = S({ x: 0, y: 0, z: 0 });
  const axes = [
    ['X', { x: AXIS_LEN, y: 0, z: 0 }, COLORS.axisX],
    ['Y', { x: 0, y: AXIS_LEN, z: 0 }, COLORS.axisY],
    ['Z', { x: 0, y: 0, z: AXIS_LEN }, COLORS.axisZ],
  ];
  for (const [name, p, color] of axes) {
    const neg = S({ x: -p.x * 0.6, y: -p.y * 0.6, z: -p.z * 0.6 });
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    line(ctx, o, neg);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    const end = S(p);
    line(ctx, o, end);
    label(ctx, name, end, color);
  }
}

function shade(normal) {
  const light = { x: -0.45, y: -0.75, z: 0.5 };
  const l = Math.hypot(light.x, light.y, light.z);
  const d = Math.max(0, -(normal.x * light.x + normal.y * light.y + normal.z * light.z) / l);
  const k = 0.35 + 0.65 * d;
  return `rgb(${Math.round(120 + 110 * k)}, ${Math.round(170 + 75 * k)}, ${Math.round(200 + 55 * k)})`;
}

function drawBody(ctx, vp, state, scene) {
  const pts = scene.projected.map(vp.toScreen);
  const mode = state.show.mode;

  if (mode === 'wire') {
    ctx.strokeStyle = COLORS.edge;
    ctx.lineWidth = 1.4;
    for (const [a, b] of scene.body.edges) line(ctx, pts[a], pts[b]);
    return;
  }

  const visibleEdges = new Set();
  for (const f of scene.faces) {
    if (!f.visible) continue;
    f.idx.forEach((a, k) => {
      const b = f.idx[(k + 1) % f.idx.length];
      visibleEdges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    });
  }

  if (mode === 'hidden') {
    ctx.strokeStyle = COLORS.hidden;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    for (const [a, b] of scene.body.edges) if (!visibleEdges.has(`${a}-${b}`)) line(ctx, pts[a], pts[b]);
    ctx.setLineDash([]);
  }

  const order = scene.faces.filter((f) => f.visible).sort((a, b) => b.depth - a.depth);
  for (const f of order) {
    ctx.beginPath();
    f.idx.forEach((i, k) => (k ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y)));
    ctx.closePath();
    if (mode === 'faces') {
      ctx.fillStyle = shade(f.normal);
      ctx.fill();
    }
    ctx.strokeStyle = COLORS.edge;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
}

function drawOwnAxes(ctx, state, scene, S) {
  const c = scene.center;
  const L = 45 * state.params.scale;
  const W = scene.W;
  const dirs = [
    [{ x: L, y: 0, z: 0 }, COLORS.axisX],
    [{ x: 0, y: L, z: 0 }, COLORS.axisY],
    [{ x: 0, y: 0, z: L }, COLORS.axisZ],
  ];
  const base = scene.body.center;
  const o = S(c);
  for (const [d, color] of dirs) {
    const end = apply(W, { x: base.x + d.x, y: base.y + d.y, z: base.z + d.z });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 3]);
    line(ctx, o, S(end));
    ctx.setLineDash([]);
  }
  ctx.fillStyle = COLORS.center;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Вид збоку на повернуту сцену: горизонтально — глибина y′, вертикально — z′; площина y = p — вертикальна лінія
export function drawSide(ctx, w, h, state, scene) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  const p = state.proj.p;
  const v = scene.view;
  const axisEnds = [
    { x: AXIS_LEN, y: 0, z: 0 },
    { x: 0, y: AXIS_LEN, z: 0 },
    { x: 0, y: 0, z: AXIS_LEN },
  ].map((q) => viewPoint(state, q));
  const ys = [...v.map((q) => q.y), p, 0, ...axisEnds.map((q) => q.y)];
  const zs = [...v.map((q) => q.z), 0, ...axisEnds.map((q) => q.z)];
  const [y0, y1, z0, z1] = [Math.min(...ys), Math.max(...ys), Math.min(...zs), Math.max(...zs)];
  const pad = 26;
  const s = Math.min((w - 2 * pad) / (y1 - y0 || 1), (h - 2 * pad - 14) / (z1 - z0 || 1));
  const T = (q) => ({ x: pad + (q.y - y0) * s, y: h - pad - (q.z - z0) * s });

  const o = T({ y: 0, z: 0 });
  [COLORS.axisX, COLORS.axisY, COLORS.axisZ].forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.2;
    line(ctx, o, T(axisEnds[i]));
  });
  ctx.globalAlpha = 1;

  ctx.strokeStyle = COLORS.ray;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  v.forEach((q) => line(ctx, T(q), T({ y: p, z: q.z })));
  ctx.setLineDash([]);

  ctx.strokeStyle = COLORS.edge;
  ctx.lineWidth = 1;
  for (const [a, b] of scene.body.edges) line(ctx, T(v[a]), T(v[b]));

  const top = T({ y: p, z: z1 });
  const bottom = T({ y: p, z: z0 });
  ctx.strokeStyle = COLORS.plane;
  ctx.lineWidth = 2.5;
  line(ctx, { x: top.x, y: top.y - 6 }, { x: bottom.x, y: bottom.y + 6 });
  ctx.fillStyle = COLORS.plane;
  v.forEach((q) => {
    const t = T({ y: p, z: q.z });
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = '12px "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = COLORS.plane;
  ctx.fillText(`y = p = ${Number(p.toFixed(1))}`, Math.min(top.x + 6, w - 95), 16);
  ctx.fillStyle = '#4A5568';
  ctx.fillText('вид збоку · промені ∥ y′', 8, h - 8);
  ctx.restore();
}
