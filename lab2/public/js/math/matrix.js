export const identity = () => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Матриця зсуву (22): dx, dy — величина зсуву по осях. */
export const translation = (dx, dy) => [
  [1, 0, 0],
  [0, 1, 0],
  [dx, dy, 1],
];

/** Матриця обертання на кут alpha (рад) навколо довільної точки (px, py), формула (23). */
export function rotationAbout(px, py, alpha) {
  const c = Math.cos(alpha);
  const s = Math.sin(alpha);
  return [
    [c, s, 0],
    [-s, c, 0],
    [-px * (c - 1) + py * s, -px * s - py * (c - 1), 1],
  ];
}

export function multiply(A, B) {
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** p · M для точки p = {x, y}. */
export function applyToPoint(M, p) {
  return {
    x: p.x * M[0][0] + p.y * M[1][0] + M[2][0],
    y: p.x * M[0][1] + p.y * M[1][1] + M[2][1],
  };
}

/** Перетворення напрямного вектора (третя координата 0, тому зсув на нього не впливає). */
export function applyToVector(M, v) {
  return {
    x: v.x * M[0][0] + v.y * M[1][0],
    y: v.x * M[0][1] + v.y * M[1][1],
  };
}

export function sceneMatrix({ dx, dy, px, py, angleDeg }) {
  const alpha = (angleDeg * Math.PI) / 180;
  return multiply(rotationAbout(px, py, alpha), translation(dx, dy));
}
