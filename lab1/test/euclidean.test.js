import { test } from 'node:test';
import { translation, rotation } from '../src/transformations/euclidean.js';
import { assertPoint } from './helpers.js';

test('зсув', () => assertPoint(translation(5, -3).apply({ x: 1, y: 1 }), 6, -2));

test('обертання на 90° навколо довільної точки', () => {
  assertPoint(rotation(90, 1, 1).apply({ x: 2, y: 1 }), 1, 2);
});

test('центр обертання залишається на місці', () => {
  assertPoint(rotation(37, 80, 80).apply({ x: 80, y: 80 }), 80, 80);
});

test('обертання зберігає відстань до центру', () => {
  const p = rotation(123, 10, 20).apply({ x: 13, y: 24 });
  const d = Math.hypot(p.x - 10, p.y - 20);
  assertPoint({ x: d, y: 0 }, 5, 0);
});
