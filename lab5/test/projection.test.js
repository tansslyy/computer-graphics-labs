import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, bodyMatrix, chain, rotationY, translation } from '../public/js/math/mat4.js';
import { ISO, distortion, projectionMatrix } from '../public/js/math/projection.js';
import { buildDiamond, DEFAULT_PARAMS } from '../public/js/model/diamond.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('ізометрія: коефіцієнти спотворення однакові й дорівнюють √(2/3)', () => {
  const d = distortion(projectionMatrix({ ...ISO, p: 0 }));
  assert.equal(d.kind, 'ізометрія');
  for (const v of d.f) close(v, Math.sqrt(2 / 3), 1e-12);
});

test('усі точки після проекції лежать у площині y = p', () => {
  const M = projectionMatrix({ ...ISO, p: 37 });
  for (const v of buildDiamond(DEFAULT_PARAMS).vertices) close(apply(M, v).y, 37, 1e-9);
});

test('зміна p не змінює зображення на площині', () => {
  const a = apply(projectionMatrix({ ...ISO, p: 0 }), { x: 10, y: -20, z: 5 });
  const b = apply(projectionMatrix({ ...ISO, p: 150 }), { x: 10, y: -20, z: 5 });
  close(a.x, b.x);
  close(a.z, b.z);
});

test('ψ = 0, φ = 0 — ортографічна проекція на y = p (вид спереду)', () => {
  const q = apply(projectionMatrix({ psi: 0, phi: 0, p: 5 }), { x: 3, y: 7, z: -2 });
  assert.deepEqual([q.x, q.y, q.z].map((v) => Number(v.toFixed(12))), [3, 5, -2]);
  assert.equal(distortion(projectionMatrix({ psi: 0, phi: 0, p: 0 })).kind, 'ортографічна');
});

test('обертання навколо власної осі не зсуває центр тіла і зберігає відстані', () => {
  const body = buildDiamond(DEFAULT_PARAMS);
  const W = bodyMatrix(body.center, { dx: 0, dy: 0, dz: 0, ax: 30, ay: 70, az: -40 });
  const c = apply(W, body.center);
  close(c.x, body.center.x);
  close(c.y, body.center.y);
  close(c.z, body.center.z);
  const [p, q] = [body.vertices[0], body.vertices[body.vertices.length - 1]];
  close(dist(apply(W, p), apply(W, q)), dist(p, q), 1e-9);
});

test('приклад із завдання: зсув на 100 по X і Y та поворот на 90° навколо власної осі Y', () => {
  const body = buildDiamond(DEFAULT_PARAMS);
  const W = bodyMatrix(body.center, { dx: 100, dy: 100, dz: 0, ax: 0, ay: 90, az: 0 });
  const c = apply(W, body.center);
  close(c.x, 100);
  close(c.y, 100);
  const expected = apply(chain(translation(0, 0, -body.center.z), rotationY(90), translation(100, 100, body.center.z)), body.vertices[0]);
  const got = apply(W, body.vertices[0]);
  close(got.x, expected.x);
  close(got.z, expected.z);
});

test('діамант: формула Ейлера V − E + F = 2, нормалі граней назовні', () => {
  for (const n of [5, 8, 12, 24]) {
    const b = buildDiamond({ ...DEFAULT_PARAMS, n });
    assert.equal(b.vertices.length - b.edges.length + b.faces.length, 2);
    for (const f of b.faces) {
      const [a, c, d] = f.map((i) => b.vertices[i]);
      const u = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
      const v = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z };
      const nrm = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const m = f.reduce((s, i) => ({ x: s.x + b.vertices[i].x, y: s.y + b.vertices[i].y, z: s.z + b.vertices[i].z }), { x: 0, y: 0, z: 0 });
      const dir = { x: m.x / f.length - b.center.x, y: m.y / f.length - b.center.y, z: m.z / f.length - b.center.z };
      assert.ok(nrm.x * dir.x + nrm.y * dir.y + nrm.z * dir.z > 0);
    }
  }
});
