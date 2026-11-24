import { applyToPoint } from '../math/matrix.js';
import { sampleContour, sampleSegment, segmentCount, segmentPoints } from '../math/curve.js';
import { jointAt } from '../math/smooth.js';

export const COLORS = {
  paper: '#FAFBFC',
  gridMinor: '#E7EBF0',
  gridMajor: '#D3D9E1',
  axisX: '#D64545',
  axisY: '#2F9E5A',
  tick: '#7A8594',
  curve: '#17202E',
  polygon: '#8A94A6',
  node: '#2B6CB0',
  breakPoint: '#E53E3E',
  endPoint: '#718096',
  ctrl: '#DD6B20',
  selected: '#D53F8C',
  center: '#4A5568',
};

const LINE = 1.8;

export function makeViewport(width, height, view) {
  const ox = width / 2 + view.offsetX;
  const oy = height / 2 + view.offsetY;
  const s = view.scale;
  return {
    width,
    height,
    scale: s,
    toScreen: (p) => ({ x: ox + p.x * s, y: oy - p.y * s }),
    toWorld: (q) => ({ x: (q.x - ox) / s, y: (oy - q.y) / s }),
  };
}

export function drawScene(ctx, vp, state, contours, M, sel) {
  const toScreen = (p) => vp.toScreen(applyToPoint(M, p));
  ctx.save();
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, vp.width, vp.height);
  if (state.show.grid) drawGrid(ctx, vp);
  drawAxes(ctx, vp, state.show.grid);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const c of contours) drawContour(ctx, c, toScreen, vp.scale, state.show.double);

  if (sel.segment) {
    const c = contours[sel.segment.ci];
    const { A, B, C, w } = segmentPoints(c, sel.segment.k);
    ctx.strokeStyle = COLORS.selected;
    ctx.lineWidth = 3;
    pathOf(ctx, sampleSegment(A, B, C, w, 60).map(toScreen));
    ctx.stroke();
  }

  if (state.show.polygon) {
    contours.forEach((c, ci) => drawPolygon(ctx, c, ci, toScreen, sel, state.show.points));
  }

  if (state.transform.angleDeg !== 0) drawRotationCenter(ctx, vp, state.transform);
  ctx.restore();
}

function pathOf(ctx, pts, closed = false) {
  ctx.beginPath();
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  if (closed) ctx.closePath();
}

function drawContour(ctx, c, toScreen, scale, double) {
  const pts = sampleContour(c, 40).map(toScreen);
  if (double) {
    pathOf(ctx, pts, c.closed);
    if (c.closed) {
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
    }
    if (c.tube > 0) {
      const t = c.tube * scale;
      ctx.strokeStyle = COLORS.curve;
      ctx.lineWidth = t + LINE;
      ctx.stroke();
      ctx.strokeStyle = COLORS.paper;
      ctx.lineWidth = Math.max(t - LINE, 0.5);
      ctx.stroke();
      return;
    }
  }
  pathOf(ctx, pts, c.closed);
  ctx.strokeStyle = COLORS.curve;
  ctx.lineWidth = LINE;
  ctx.stroke();
}

function drawPolygon(ctx, c, ci, toScreen, sel, withPoints) {
  for (let k = 0; k < segmentCount(c); k++) {
    const { A, B, C } = segmentPoints(c, k);
    const active = sel.segment && sel.segment.ci === ci && sel.segment.k === k;
    ctx.strokeStyle = active ? COLORS.selected : COLORS.polygon;
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.setLineDash(active ? [] : [5, 4]);
    pathOf(ctx, [A, B, C].map(toScreen));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (!withPoints) return;

  const isSel = (kind, k) => sel.point && sel.point.ci === ci && sel.point.kind === kind && sel.point.k === k;
  c.ctrl.forEach((p, k) => {
    const q = toScreen(p);
    const r = isSel('ctrl', k) ? 6 : 4.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = isSel('ctrl', k) ? COLORS.selected : COLORS.ctrl;
    ctx.lineWidth = 2;
    ctx.fillRect(q.x - r, q.y - r, 2 * r, 2 * r);
    ctx.strokeRect(q.x - r, q.y - r, 2 * r, 2 * r);
  });
  c.nodes.forEach((p, k) => {
    const q = toScreen(p);
    const joint = jointAt(c, k);
    const r = isSel('node', k) ? 6.5 : 5;
    let color = COLORS.endPoint;
    if (joint) color = c.smooth[k] ? COLORS.node : COLORS.breakPoint;
    ctx.fillStyle = color;
    ctx.strokeStyle = isSel('node', k) ? COLORS.selected : '#FFFFFF';
    ctx.lineWidth = isSel('node', k) ? 2.5 : 1.5;
    ctx.beginPath();
    if (joint && !c.smooth[k]) {
      ctx.moveTo(q.x, q.y - r - 1);
      ctx.lineTo(q.x + r + 1, q.y);
      ctx.lineTo(q.x, q.y + r + 1);
      ctx.lineTo(q.x - r - 1, q.y);
      ctx.closePath();
    } else {
      ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  });
}

function drawRotationCenter(ctx, vp, tr) {
  const c = vp.toScreen({ x: tr.px, y: tr.py });
  ctx.strokeStyle = COLORS.center;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
  ctx.moveTo(c.x - 10, c.y);
  ctx.lineTo(c.x + 10, c.y);
  ctx.moveTo(c.x, c.y - 10);
  ctx.lineTo(c.x, c.y + 10);
  ctx.stroke();
}

function gridStep(scale) {
  for (const s of [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50]) if (s * scale >= 26) return s;
  return 100;
}

function drawGrid(ctx, vp) {
  const step = gridStep(vp.scale);
  const tl = vp.toWorld({ x: 0, y: 0 });
  const br = vp.toWorld({ x: vp.width, y: vp.height });
  const major = (v) => Math.abs(v / (step * 5) - Math.round(v / (step * 5))) < 1e-9;
  ctx.lineWidth = 1;
  for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
    ctx.strokeStyle = major(x) ? COLORS.gridMajor : COLORS.gridMinor;
    const sx = Math.round(vp.toScreen({ x, y: 0 }).x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, vp.height);
    ctx.stroke();
  }
  for (let y = Math.floor(br.y / step) * step; y <= tl.y; y += step) {
    ctx.strokeStyle = major(y) ? COLORS.gridMajor : COLORS.gridMinor;
    const sy = Math.round(vp.toScreen({ x: 0, y }).y) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(vp.width, sy);
    ctx.stroke();
  }
}

function drawAxes(ctx, vp, withLabels) {
  const o = vp.toScreen({ x: 0, y: 0 });
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = COLORS.axisX;
  ctx.beginPath();
  ctx.moveTo(0, o.y);
  ctx.lineTo(vp.width, o.y);
  ctx.stroke();
  ctx.strokeStyle = COLORS.axisY;
  ctx.beginPath();
  ctx.moveTo(o.x, 0);
  ctx.lineTo(o.x, vp.height);
  ctx.stroke();

  if (!withLabels) return;
  const step = gridStep(vp.scale) * 2;
  const tl = vp.toWorld({ x: 0, y: 0 });
  const br = vp.toWorld({ x: vp.width, y: vp.height });
  ctx.fillStyle = COLORS.tick;
  ctx.font = '11px "Segoe UI", Roboto, sans-serif';
  const label = (v) => Number(v.toFixed(2)).toString();
  const ly = Math.min(Math.max(o.y + 14, 14), vp.height - 4);
  for (let x = Math.ceil(tl.x / step) * step; x <= br.x; x += step) {
    if (Math.abs(x) < 1e-9) continue;
    ctx.fillText(label(x), vp.toScreen({ x, y: 0 }).x + 3, ly);
  }
  const lx = Math.min(Math.max(o.x + 4, 4), vp.width - 30);
  for (let y = Math.ceil(br.y / step) * step; y <= tl.y; y += step) {
    if (Math.abs(y) < 1e-9) continue;
    ctx.fillText(label(y), lx, vp.toScreen({ x: 0, y }).y - 3);
  }
  ctx.fillText('0', o.x + 4, o.y + 14);
}
