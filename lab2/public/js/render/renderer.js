import { applyToPoint, applyToVector } from '../math/matrix.js';
import { LongchampsTrisectrix } from '../math/trisectrix.js';

export const COLORS = {
  paper: '#FAFBFC',
  gridMinor: '#E7EBF0',
  gridMajor: '#D3D9E1',
  axisX: '#D64545',
  axisY: '#2F9E5A',
  tick: '#7A8594',
  curve: '#17202E',
  asymptote: '#B83280',
  triangle: 'rgba(184, 50, 128, 0.07)',
  tangent: '#2B6CB0',
  normal: '#0E8A82',
  arc: '#6B46C1',
  segment: 'rgba(107, 70, 193, 0.16)',
  point: '#E53E3E',
  center: '#4A5568',
};

const TANGENT_HALF_PX = 140; // половина довжини дотичної/нормалі на екрані (як 200px у методичці)

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

export function drawScene(ctx, vp, state, curve, M) {
  ctx.save();
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, vp.width, vp.height);

  if (state.show.grid) drawGrid(ctx, vp);
  drawAxes(ctx, vp, state.show.grid);

  // радіус, якого вистачає, щоб гілки кривої та асимптоти перекрили весь видимий екран
  const corners = [
    vp.toWorld({ x: 0, y: 0 }),
    vp.toWorld({ x: vp.width, y: 0 }),
    vp.toWorld({ x: 0, y: vp.height }),
    vp.toWorld({ x: vp.width, y: vp.height }),
  ];
  const viewR = Math.max(...corners.map((c) => Math.hypot(c.x, c.y)));
  const shift = applyToPoint(M, { x: 0, y: 0 });
  const rMax = (viewR + Math.hypot(shift.x, shift.y)) * 1.3 + Math.abs(curve.a);

  if (state.show.triangle) {
    const tri = curve.asymptoticTriangle().map((p) => vp.toScreen(applyToPoint(M, p)));
    ctx.fillStyle = COLORS.triangle;
    ctx.beginPath();
    tri.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    ctx.fill();
  }

  if (state.show.asymptotes) {
    ctx.strokeStyle = COLORS.asymptote;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([7, 5]);
    for (const line of curve.asymptotes()) {
      const p1 = { x: line.point.x - line.dir.x * rMax * 2, y: line.point.y - line.dir.y * rMax * 2 };
      const p2 = { x: line.point.x + line.dir.x * rMax * 2, y: line.point.y + line.dir.y * rMax * 2 };
      strokeSegment(ctx, vp, applyToPoint(M, p1), applyToPoint(M, p2));
    }
    ctx.setLineDash([]);
  }

  const phi = (state.phiDeg * Math.PI) / 180;
  const branch = LongchampsTrisectrix.branchOf(phi);
  const P = curve.point(phi);

  if (state.show.segment && P && branch) drawSegment(ctx, vp, curve, M, phi, branch.vertex);

  // крива: кожна гілка — окрема ламана, тому зайвих ліній через розриви немає
  ctx.strokeStyle = COLORS.curve;
  ctx.lineWidth = 2;
  for (const pts of curve.branches(rMax)) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = vp.toScreen(applyToPoint(M, p));
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
  }

  if (state.transform.angleDeg !== 0) drawRotationCenter(ctx, vp, state.transform);

  if (P) {
    const Pw = applyToPoint(M, P);
    const d = curve.derivative(phi);
    const len = Math.hypot(d.dx, d.dy);
    const t = applyToVector(M, { x: d.dx / len, y: d.dy / len });
    const n = { x: -t.y, y: t.x };
    const half = TANGENT_HALF_PX / vp.scale;

    ctx.lineWidth = 1.8;
    if (state.show.tangent) {
      ctx.strokeStyle = COLORS.tangent;
      strokeSegment(ctx, vp, { x: Pw.x - t.x * half, y: Pw.y - t.y * half }, { x: Pw.x + t.x * half, y: Pw.y + t.y * half });
    }
    if (state.show.normal) {
      ctx.strokeStyle = COLORS.normal;
      strokeSegment(ctx, vp, { x: Pw.x - n.x * half, y: Pw.y - n.y * half }, { x: Pw.x + n.x * half, y: Pw.y + n.y * half });
    }
    if (state.show.point) {
      const q = vp.toScreen(Pw);
      ctx.fillStyle = COLORS.point;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.curve;
      ctx.font = 'italic 600 15px Georgia, "Times New Roman", serif';
      ctx.fillText('P', q.x + 9, q.y - 9);
    }
  }
  ctx.restore();
}

function strokeSegment(ctx, vp, a, b) {
  const qa = vp.toScreen(a);
  const qb = vp.toScreen(b);
  ctx.beginPath();
  ctx.moveTo(qa.x, qa.y);
  ctx.lineTo(qb.x, qb.y);
  ctx.stroke();
}

/** Сегмент кривої між P' і P (з хордою) та дуга від вершини гілки до P. */
function drawSegment(ctx, vp, curve, M, phi, vertex) {
  const psi = phi - vertex;
  const N = 400;
  const poly = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.point(vertex - psi + (2 * psi * i) / N);
    if (p) poly.push(vp.toScreen(applyToPoint(M, p)));
  }
  ctx.fillStyle = COLORS.segment;
  ctx.beginPath();
  poly.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = COLORS.arc;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const p = curve.point(vertex + (psi * i) / N);
    if (!p) continue;
    const q = vp.toScreen(applyToPoint(M, p));
    i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
  }
  ctx.stroke();

  const V = vp.toScreen(applyToPoint(M, curve.point(vertex)));
  ctx.fillStyle = COLORS.arc;
  ctx.beginPath();
  ctx.arc(V.x, V.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.lineWidth = 1;
  for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
    ctx.strokeStyle = Math.abs(x / (step * 5) - Math.round(x / (step * 5))) < 1e-9 ? COLORS.gridMajor : COLORS.gridMinor;
    const sx = Math.round(vp.toScreen({ x, y: 0 }).x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, vp.height);
    ctx.stroke();
  }
  for (let y = Math.floor(br.y / step) * step; y <= tl.y; y += step) {
    ctx.strokeStyle = Math.abs(y / (step * 5) - Math.round(y / (step * 5))) < 1e-9 ? COLORS.gridMajor : COLORS.gridMinor;
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
