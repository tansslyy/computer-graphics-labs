// Похідні раціональної кривої 2-го порядку на кінцях сегмента:
// r'(0) = 2 wB/wA (B − A),   r'(1) = 2 wB/wC (C − B)
export function startDerivative(A, B, w) {
  const k = (2 * w[1]) / w[0];
  return { x: k * (B.x - A.x), y: k * (B.y - A.y) };
}

export function endDerivative(B, C, w) {
  const k = (2 * w[1]) / w[2];
  return { x: k * (C.x - B.x), y: k * (C.y - B.y) };
}

const len = (v) => Math.hypot(v.x, v.y);

// Стик у вузлі k: сегмент p закінчується у вузлі, сегмент q з нього починається
export function jointAt(c, k) {
  const n = c.ctrl.length;
  if (!c.closed && (k === 0 || k === n)) return null;
  return { p: (k - 1 + n) % n, q: k % n, node: k };
}

export function isJointSmooth(c, k) {
  return Boolean(jointAt(c, k)) && c.smooth[k];
}

// Умова гладкості: r1'(1) = α1·T,  r2'(0) = α2·T
// moved = 'p' — вручну змінено реперну точку сегмента p, підлаштовується точка сегмента q, і навпаки
export function enforceSmooth(c, k, moved, equalLength = false) {
  const j = jointAt(c, k);
  if (!j || j.p === j.q) return;
  const N = c.nodes[k];
  const wp = c.weights[j.p];
  const wq = c.weights[j.q];
  const d1 = endDerivative(c.ctrl[j.p], N, wp);
  const d2 = startDerivative(N, c.ctrl[j.q], wq);
  const a1 = len(d1);
  const a2 = len(d2);
  if (a1 < 1e-9 || a2 < 1e-9) return;

  if (moved === 'p') {
    const T = { x: d1.x / a1, y: d1.y / a1 };
    const alpha = equalLength ? a1 : a2;
    const s = (alpha * wq[0]) / (2 * wq[1]);
    c.ctrl[j.q] = { x: N.x + s * T.x, y: N.y + s * T.y };
  } else {
    const T = { x: d2.x / a2, y: d2.y / a2 };
    const alpha = equalLength ? a2 : a1;
    const s = (alpha * wp[2]) / (2 * wp[1]);
    c.ctrl[j.p] = { x: N.x - s * T.x, y: N.y - s * T.y };
  }
}

// Вирівнювання стику при перетворенні точки зламу на вузлову: дотична — бісектриса двох напрямків
export function alignJoint(c, k) {
  const j = jointAt(c, k);
  if (!j) return;
  const N = c.nodes[k];
  const P = c.ctrl[j.p];
  const Q = c.ctrl[j.q];
  const lp = Math.hypot(N.x - P.x, N.y - P.y);
  const lq = Math.hypot(Q.x - N.x, Q.y - N.y);
  if (lp < 1e-9 || lq < 1e-9) return;
  const t = { x: (N.x - P.x) / lp + (Q.x - N.x) / lq, y: (N.y - P.y) / lp + (Q.y - N.y) / lq };
  const lt = len(t);
  if (lt < 1e-9) return;
  const T = { x: t.x / lt, y: t.y / lt };
  c.ctrl[j.p] = { x: N.x - lp * T.x, y: N.y - lp * T.y };
  c.ctrl[j.q] = { x: N.x + lq * T.x, y: N.y + lq * T.y };
}

// Кут між дотичними у стику, градуси (0 — гладко)
export function jointAngle(c, k) {
  const j = jointAt(c, k);
  if (!j) return 0;
  const d1 = endDerivative(c.ctrl[j.p], c.nodes[k], c.weights[j.p]);
  const d2 = startDerivative(c.nodes[k], c.ctrl[j.q], c.weights[j.q]);
  const cos = (d1.x * d2.x + d1.y * d2.y) / (len(d1) * len(d2));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
