import { test } from 'node:test';
import { Matrix3 } from '../src/math/matrix3.js';
import { translation } from '../src/transformations/euclidean.js';
import { assertPoint } from './helpers.js';

test('одинична матриця не змінює точку', () => assertPoint(Matrix3.identity().apply({ x: 3, y: 4 }), 3, 4));

test('композиція: a.multiply(b) — спочатку a, потім b', () => {
  const m = translation(1, 0).multiply(translation(0, 2));
  assertPoint(m.apply({ x: 0, y: 0 }), 1, 2);
});
