import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineeringPoint, arcType, sampleContour } from '../public/js/math/curve.js';
import { applyToPoint, invertAffine, sceneMatrix } from '../public/js/math/matrix.js';
import { contour27, cloneContours } from '../public/js/model/contour27.js';
import { interpolate, morphTarget } from '../public/js/model/morph.js';
import { movePoint } from '../public/js/model/editor.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const A = { x: 0, y: 0 };
const B = { x: 2, y: 3 };
const C = { x: 5, y: 1 };

test('u = 0 дає точку A, u = 1 — точку C', () => {
  const w = [1.3, 0.7, 2];
  assert.deepEqual(engineeringPoint(A, B, C, w, 0), A);
  const p = engineeringPoint(A, B, C, w, 1);
  close(p.x, C.x);
  close(p.y, C.y);
});

test('при одиничних вагах крива збігається з кривою Безьє 2-го порядку', () => {
  for (const u of [0.1, 0.35, 0.5, 0.9]) {
    const p = engineeringPoint(A, B, C, [1, 1, 1], u);
    close(p.x, A.x * (1 - u) ** 2 + 2 * B.x * u * (1 - u) + C.x * u * u);
    close(p.y, A.y * (1 - u) ** 2 + 2 * B.y * u * (1 - u) + C.y * u * u);
  }
});

test('wB = cos 45° дає чверть кола', () => {
  const p = (u) => engineeringPoint({ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, [1, Math.SQRT1_2, 1], u);
  for (const u of [0.2, 0.5, 0.77]) close(Math.hypot(p(u).x, p(u).y), 1, 1e-12);
});

test('тип дуги за дискримінантом f', () => {
  assert.equal(arcType([1, 0.5, 1]).type, 'еліпс');
  assert.equal(arcType([1, 1, 1]).type, 'парабола');
  assert.equal(arcType([1, 3, 1]).type, 'гіпербола');
  close(arcType([1, 1, 1]).f, 0.5);
});

test('контур №27: 7 елементів, 37 дуг, кількість вузлів узгоджена', () => {
  const cs = contour27();
  assert.equal(cs.length, 7);
  assert.equal(cs.reduce((s, c) => s + c.ctrl.length, 0), 37);
  for (const c of cs) assert.equal(c.nodes.length, c.closed ? c.ctrl.length : c.ctrl.length + 1);
});

test('евклідове перетворення зберігає відстані, обернена матриця повертає точку', () => {
  const M = sceneMatrix({ dx: 3, dy: -2, px: 1, py: 4, angleDeg: 37 });
  const p = applyToPoint(M, B);
  const q = applyToPoint(M, C);
  close(Math.hypot(p.x - q.x, p.y - q.y), Math.hypot(B.x - C.x, B.y - C.y), 1e-12);
  const back = applyToPoint(invertAffine(M), p);
  close(back.x, B.x, 1e-12);
  close(back.y, B.y, 1e-12);
});

test('морфінг: t = 0 — початковий контур, t = 1 — цільова фігура', () => {
  const src = contour27();
  const dst = morphTarget(src);
  assert.deepEqual(sampleContour(interpolate(src, dst, 0)[0]), sampleContour(src[0]));
  assert.deepEqual(interpolate(src, dst, 1)[5].weights, dst[5].weights);
});

test('переміщення вузла з гладкістю зсуває сусідні реперні точки', () => {
  const cs = cloneContours(contour27());
  const before = cs[0].ctrl.slice(1, 3).map((p) => ({ ...p }));
  const N = cs[0].nodes[2];
  movePoint(cs, { ci: 0, kind: 'node', k: 2 }, { x: N.x + 1, y: N.y + 1 }, true);
  cs[0].ctrl.slice(1, 3).forEach((p, i) => {
    close(p.x, before[i].x + 1);
    close(p.y, before[i].y + 1);
  });
});
