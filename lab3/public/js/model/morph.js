import { applyToPoint, multiply, rotationAbout, translation } from '../math/matrix.js';
import { circleWeight } from '../math/curve.js';
import { cloneContours } from './contour27.js';

const deg = (a) => (a * Math.PI) / 180;

function center(c) {
  const s = c.nodes.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / c.nodes.length, y: s.y / c.nodes.length };
}

function moveRigid(c, pivot, angle, to) {
  const M = multiply(rotationAbout(pivot.x, pivot.y, deg(angle)), translation(to.x - pivot.x, to.y - pivot.y));
  c.nodes = c.nodes.map((p) => applyToPoint(M, p));
  c.ctrl = c.ctrl.map((p) => applyToPoint(M, p));
}

function wave(c, x0, x1, y, amp) {
  const n = c.ctrl.length;
  const h = (x1 - x0) / n;
  c.nodes = c.nodes.map((_, i) => ({ x: x0 + i * h, y }));
  c.ctrl = c.ctrl.map((_, i) => ({ x: x0 + (i + 0.5) * h, y: y + (i % 2 ? -amp : amp) }));
  c.weights = c.weights.map(() => [1, 1, 1]);
}

function circle(c, o, r) {
  const n = c.ctrl.length;
  const c0 = center(c);
  const start = Math.atan2(c.nodes[0].y - c0.y, c.nodes[0].x - c0.x);
  const half = Math.PI / n;
  const rb = r / Math.cos(half);
  c.nodes = c.nodes.map((_, k) => ({ x: o.x + r * Math.cos(start + 2 * k * half), y: o.y + r * Math.sin(start + 2 * k * half) }));
  c.ctrl = c.ctrl.map((_, k) => ({ x: o.x + rb * Math.cos(start + (2 * k + 1) * half), y: o.y + rb * Math.sin(start + (2 * k + 1) * half) }));
  c.weights = c.weights.map(() => [1, circleWeight(half), 1]);
}

// Цільова фігура: розгорнута скакалка, зірки перетворюються на кола
export function morphTarget(source) {
  const t = cloneContours(source);
  const [rope, topHandle, topKnob, bottomHandle, bottomKnob, bigStar, smallStar] = t;

  wave(rope, -10, 10, 0, 1.8);

  const tk = center(topKnob);
  moveRigid(topHandle, tk, 110, { x: -11.5, y: 0 });
  moveRigid(topKnob, tk, 110, { x: -11.5, y: 0 });

  const bk = center(bottomKnob);
  moveRigid(bottomHandle, bk, 67, { x: 11.5, y: 0 });
  moveRigid(bottomKnob, bk, 67, { x: 11.5, y: 0 });

  circle(bigStar, { x: 4, y: 7 }, 2.4);
  circle(smallStar, { x: -4, y: 7 }, 1.7);
  return t;
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerpPt = (p, q, t) => ({ x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) });

export function interpolate(from, to, t) {
  return from.map((c, i) => ({
    ...c,
    nodes: c.nodes.map((p, k) => lerpPt(p, to[i].nodes[k], t)),
    ctrl: c.ctrl.map((p, k) => lerpPt(p, to[i].ctrl[k], t)),
    weights: c.weights.map((w, k) => w.map((v, j) => lerp(v, to[i].weights[k][j], t))),
  }));
}
