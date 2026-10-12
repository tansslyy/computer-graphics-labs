import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix3 } from '../src/math/matrix3.js';

const close = (p, x, y) => {
  assert.ok(Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9, `очікували (${x}, ${y}), отримали (${p.x}, ${p.y})`);
};

test('зсув', () => close(Matrix3.translation(5, -3).apply({ x: 1, y: 1 }), 6, -2));

test('обертання на 90° навколо довільної точки', () => {
  close(Matrix3.rotation(90, 1, 1).apply({ x: 2, y: 1 }), 1, 2);
});

test('центр обертання не рухається', () => {
  close(Matrix3.rotation(37, 80, 80).apply({ x: 80, y: 80 }), 80, 80);
});

test('масштаб відносно точки', () => close(Matrix3.scaling(2, 3, 10, 10).apply({ x: 11, y: 11 }), 12, 13));

test('центральна симетрія', () => close(Matrix3.pointSymmetry(5, 5).apply({ x: 7, y: 2 }), 3, 8));

test('симетрія = масштаб з k = −1', () => {
  const p = { x: 13, y: -4 };
  const a = Matrix3.pointSymmetry(3, 7).apply(p);
  close(Matrix3.scaling(-1, -1, 3, 7).apply(p), a.x, a.y);
});

test('афінна система: точка = O + x·X + y·Y', () => {
  close(Matrix3.affine(2, 1, 0, 1, 5, 5).apply({ x: 3, y: 4 }), 11, 12);
});

test('проективна система збігається з формулою', () => {
  const [Xx, Xy, wX, Yx, Yy, wY, Ox, Oy, w0] = [250, 0, 4, 0, 250, 1, 0, 0, 500];
  const p = { x: 120, y: 60 };
  const w = w0 + wX * p.x + wY * p.y;
  close(Matrix3.projective(Xx, Xy, wX, Yx, Yy, wY, Ox, Oy, w0).apply(p),
    (Ox * w0 + Xx * wX * p.x + Yx * wY * p.y) / w,
    (Oy * w0 + Xy * wX * p.x + Yy * wY * p.y) / w);
});

test('точка за горизонтом повертає null', () => {
  assert.equal(Matrix3.projective(1, 0, 1, 0, 1, 0, 0, 0, 10).apply({ x: -20, y: 0 }), null);
});
