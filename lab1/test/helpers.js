import assert from 'node:assert/strict';

export function assertPoint(p, x, y) {
  assert.ok(p, 'очікували точку, отримали null');
  assert.ok(Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9,
    `очікували (${x}, ${y}), отримали (${p.x}, ${p.y})`);
}
