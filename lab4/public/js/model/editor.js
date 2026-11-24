import { sampleSegment, segmentCount, segmentPoints } from '../math/curve.js';
import { alignJoint, enforceSmooth, isJointSmooth, jointAt } from '../math/smooth.js';

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

export function movePoint(contours, ref, p, opts) {
  const c = contours[ref.ci];
  const on = opts.enabled;
  if (ref.kind === 'node') {
    const N = c.nodes[ref.k];
    const dx = p.x - N.x;
    const dy = p.y - N.y;
    c.nodes[ref.k] = { ...p };
    if (on && isJointSmooth(c, ref.k)) {
      for (const j of neighbourCtrl(c, ref.k)) c.ctrl[j] = { x: c.ctrl[j].x + dx, y: c.ctrl[j].y + dy };
    }
    return;
  }

  c.ctrl[ref.k] = { ...p };
  if (!on) return;
  const n = c.nodes.length;
  const start = ref.k;
  const end = (ref.k + 1) % n;
  if (isJointSmooth(c, start)) enforceSmooth(c, start, 'q', opts.equalLength);
  if (isJointSmooth(c, end)) enforceSmooth(c, end, 'p', opts.equalLength);
}

export function toggleJoint(c, k) {
  if (!jointAt(c, k)) return false;
  c.smooth[k] = !c.smooth[k];
  if (c.smooth[k]) alignJoint(c, k);
  return true;
}

export function refreshSegment(c, k, opts) {
  if (!opts.enabled) return;
  const n = c.nodes.length;
  if (isJointSmooth(c, k)) enforceSmooth(c, k, 'q', opts.equalLength);
  if (isJointSmooth(c, (k + 1) % n)) enforceSmooth(c, (k + 1) % n, 'p', opts.equalLength);
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
