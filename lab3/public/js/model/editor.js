import { sampleSegment, segmentCount, segmentPoints } from '../math/curve.js';

const SMOOTH_TOL = Math.sin((4 * Math.PI) / 180);

function neighbourCtrl(c, nodeIdx) {
  const n = c.ctrl.length;
  const res = [];
  if (c.closed) {
    res.push(nodeIdx % n, (nodeIdx - 1 + n) % n);
  } else {
    if (nodeIdx < n) res.push(nodeIdx);
    if (nodeIdx > 0) res.push(nodeIdx - 1);
  }
  return res;
}

function otherCtrlAt(c, k, end) {
  const n = c.ctrl.length;
  if (end === 'A') {
    if (!c.closed && k === 0) return null;
    return { node: k, other: (k - 1 + n) % n };
  }
  if (!c.closed && k === n - 1) return null;
  return { node: (k + 1) % c.nodes.length, other: (k + 1) % n };
}

function isSmooth(N, B1, B2) {
  const ux = N.x - B1.x;
  const uy = N.y - B1.y;
  const vx = B2.x - N.x;
  const vy = B2.y - N.y;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu < 1e-9 || lv < 1e-9) return false;
  return Math.abs(ux * vy - uy * vx) / (lu * lv) < SMOOTH_TOL && ux * vx + uy * vy > 0;
}

export function movePoint(contours, ref, p, smooth) {
  const c = contours[ref.ci];
  if (ref.kind === 'node') {
    const N = c.nodes[ref.k];
    const dx = p.x - N.x;
    const dy = p.y - N.y;
    c.nodes[ref.k] = { ...p };
    if (smooth) {
      for (const j of neighbourCtrl(c, ref.k)) c.ctrl[j] = { x: c.ctrl[j].x + dx, y: c.ctrl[j].y + dy };
    }
    return;
  }

  const joints = smooth
    ? ['A', 'C'].map((end) => otherCtrlAt(c, ref.k, end)).filter((j) => j && isSmooth(c.nodes[j.node], c.ctrl[ref.k], c.ctrl[j.other]))
    : [];
  c.ctrl[ref.k] = { ...p };
  for (const j of joints) {
    if (j.other === ref.k) continue;
    const N = c.nodes[j.node];
    const B = c.ctrl[j.other];
    const len = Math.hypot(B.x - N.x, B.y - N.y);
    const dx = N.x - p.x;
    const dy = N.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    c.ctrl[j.other] = { x: N.x + (dx / d) * len, y: N.y + (dy / d) * len };
  }
}

export function setWeight(contours, ci, k, idx, value) {
  contours[ci].weights[k][idx] = Math.max(0.01, value);
}

export function hitPoint(contours, toScreen, q, radius = 9) {
  let best = null;
  let bestD = radius;
  contours.forEach((c, ci) => {
    const test = (p, kind, k) => {
      const s = toScreen(p);
      const d = Math.hypot(s.x - q.x, s.y - q.y);
      if (d <= bestD) {
        bestD = d;
        best = { ci, kind, k };
      }
    };
    c.nodes.forEach((p, k) => test(p, 'node', k));
    c.ctrl.forEach((p, k) => test(p, 'ctrl', k));
  });
  return best;
}

export function hitSegment(contours, toScreen, q, radius = 7) {
  let best = null;
  let bestD = radius;
  contours.forEach((c, ci) => {
    for (let k = 0; k < segmentCount(c); k++) {
      const { A, B, C, w } = segmentPoints(c, k);
      const pts = sampleSegment(A, B, C, w, 30).map(toScreen);
      for (let i = 1; i < pts.length; i++) {
        const d = distToSegment(q, pts[i - 1], pts[i]);
        if (d < bestD) {
          bestD = d;
          best = { ci, k };
        }
      }
    }
  });
  return best;
}

export function segmentOfPoint(c, ref) {
  if (ref.kind === 'ctrl') return ref.k;
  if (!c.closed && ref.k === c.nodes.length - 1) return ref.k - 1;
  return ref.k % c.ctrl.length;
}

function distToSegment(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy);
}
