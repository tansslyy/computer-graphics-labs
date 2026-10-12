import { test } from 'node:test';
import { scaling, pointSymmetry, affineSystem } from '../src/transformations/affine.js';
import { assertPoint } from './helpers.js';

test('масштаб відносно точки', () => assertPoint(scaling(2, 3, 10, 10).apply({ x: 11, y: 11 }), 12, 13));

test('центральна симетрія', () => assertPoint(pointSymmetry(5, 5).apply({ x: 7, y: 2 }), 3, 8));

test('симетрія = масштаб з k = −1', () => {
  const p = { x: 13, y: -4 };
  const s = pointSymmetry(3, 7).apply(p);
  assertPoint(scaling(-1, -1, 3, 7).apply(p), s.x, s.y);
});

test('афінна система: точка = O + x·X + y·Y', () => {
  assertPoint(affineSystem(2, 1, 0, 1, 5, 5).apply({ x: 3, y: 4 }), 11, 12);
});
