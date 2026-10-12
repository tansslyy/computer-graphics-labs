import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectiveSystem } from '../src/transformations/projective.js';
import { assertPoint } from './helpers.js';

test('проективна система збігається з формулою з методички', () => {
  const [Xx, Xy, wX, Yx, Yy, wY, Ox, Oy, w0] = [250, 0, 4, 0, 250, 1, 0, 0, 500];
  const p = { x: 120, y: 60 };
  const w = w0 + wX * p.x + wY * p.y;
  assertPoint(projectiveSystem(Xx, Xy, wX, Yx, Yy, wY, Ox, Oy, w0).apply(p),
    (Ox * w0 + Xx * wX * p.x + Yx * wY * p.y) / w,
    (Oy * w0 + Xy * wX * p.x + Yy * wY * p.y) / w);
});

test('точка за горизонтом повертає null', () => {
  assert.equal(projectiveSystem(1, 0, 1, 0, 1, 0, 0, 0, 10).apply({ x: -20, y: 0 }), null);
});
