// Перевірка математичної моделі: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LongchampsTrisectrix } from '../public/js/math/trisectrix.js';
import { sceneMatrix, applyToPoint } from '../public/js/math/matrix.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('точки задовольняють декартове рівняння x³ − 3xy² = a(x² + y²)', () => {
  const c = new LongchampsTrisectrix(2.5);
  for (const phi of [-1.4, -0.9, -0.3, 0, 0.2, 0.7, 1.3]) {
    const { x, y } = c.point(phi);
    close(x ** 3 - 3 * x * y * y, c.a * (x * x + y * y), 1e-6 * (1 + x * x + y * y) ** 1.5);
  }
});

test('у розривах φ = ±π/6, ±π/2 точки немає', () => {
  const c = new LongchampsTrisectrix(3);
  for (const phi of [Math.PI / 6, -Math.PI / 6, Math.PI / 2]) assert.equal(c.point(phi), null);
});

test('віддалені точки наближаються до асимптот', () => {
  const c = new LongchampsTrisectrix(3);
  const lines = c.asymptotes();
  const dist = (p, l) => Math.abs((p.x - l.point.x) * l.dir.y - (p.y - l.point.y) * l.dir.x);
  // біля кожного розриву точка йде у нескінченність уздовж відповідної асимптоти
  const far = [c.point(Math.PI / 2 - 1e-5), c.point(Math.PI / 6 - 1e-5), c.point(-Math.PI / 6 + 1e-5)];
  const best = far.map((p) => Math.min(...lines.map((l) => dist(p, l))));
  best.forEach((d) => assert.ok(d < 1e-3, `відстань до асимптоти ${d}`));
});

test('площа асимптотичного трикутника = a²/√3', () => {
  const c = new LongchampsTrisectrix(4);
  const s = c.triangleArea();
  close(s.analytic, 16 / Math.sqrt(3));
  close(s.numeric, s.analytic, 1e-9);
});

test('радіус кривини: аналітична формула збігається з параметричною, у вершині R = a/8', () => {
  const c = new LongchampsTrisectrix(4);
  close(c.curvatureRadiusAnalytic(0), 0.5);
  for (const phi of [0.1, 0.35, -0.8, 1.2]) {
    close(1 / Math.abs(c.curvature(phi)), c.curvatureRadiusAnalytic(phi), 1e-6);
  }
});

test('точок перегину немає', () => {
  assert.equal(new LongchampsTrisectrix(3).inflectionPoints().length, 0);
});

test('площі сектора і сегмента: аналітика = чисельний розрахунок', () => {
  const c = new LongchampsTrisectrix(3);
  for (const phi of [0.3, -0.2, 1.2, -0.9]) {
    const sec = c.sectorArea(phi);
    const seg = c.segmentArea(phi);
    close(sec.analytic, sec.numeric, 1e-6);
    close(seg.analytic, seg.numeric, 1e-3);
  }
});

test('довжина дуги збігається з довжиною ламаної', () => {
  const c = new LongchampsTrisectrix(3);
  const L = c.arcLength(0, 0.4);
  let poly = 0;
  let prev = c.point(0);
  for (let i = 1; i <= 20000; i++) {
    const p = c.point((0.4 * i) / 20000);
    poly += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  close(L, poly, 1e-4);
});

test('обертання навколо довільної точки залишає її на місці', () => {
  const M = sceneMatrix({ dx: 0, dy: 0, px: 2, py: -1, angleDeg: 73 });
  const p = applyToPoint(M, { x: 2, y: -1 });
  close(p.x, 2);
  close(p.y, -1);
  const q = applyToPoint(sceneMatrix({ dx: 0, dy: 0, px: 0, py: 0, angleDeg: 90 }), { x: 1, y: 0 });
  close(q.x, 0);
  close(q.y, 1);
});

test('площа між гілкою та асимптотами скінченна і дорівнює a²/(3√3)', () => {
  const c = new LongchampsTrisectrix(3);
  const s = c.areaBetweenBranchAndAsymptotes();
  close(s.analytic, 9 / (3 * Math.sqrt(3)));
  close(s.numeric, s.analytic, 1e-3);
});
