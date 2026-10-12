import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDetail } from '../src/geometry/detail.js';
import { DEFAULT_PARAMS, validateParams } from '../src/geometry/detailParams.js';
import { LineStyle } from '../src/geometry/shapes.js';

const ends = (pl) => [pl.points[0], pl.points[pl.points.length - 1]];
const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-9;

/** Кожен кінець основної лінії має збігатися з кінцем іншої основної лінії — контур замкнений. */
function assertConnected(params) {
  const main = buildDetail(params).filter((p) => p.style === LineStyle.MAIN);
  const all = main.flatMap(ends);
  for (const p of all) {
    const count = all.filter((q) => same(p, q)).length;
    assert.ok(count >= 2, `незʼєднаний кінець у (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  }
}

test('стандартні розміри варіанту 4 коректні', () => {
  assert.equal(validateParams(DEFAULT_PARAMS), null);
});

test('контур замкнений за стандартних розмірів', () => assertConnected(DEFAULT_PARAMS));

test('контур лишається замкненим після зміни розмірів', () => {
  assertConnected({ ...DEFAULT_PARAMS, R1: 35, S: 16, H: 140, L: 130 });
  assertConnected({ ...DEFAULT_PARAMS, R2: 4, B: 50 });
});

test('некоректні розміри відхиляються', () => {
  assert.ok(validateParams({ ...DEFAULT_PARAMS, R2: 30 }));
  assert.ok(validateParams({ ...DEFAULT_PARAMS, S: 60 }));
  assert.ok(validateParams({ ...DEFAULT_PARAMS, B: 80 }));
});
