// Точка — рядок [x y z 1], множиться на матрицю справа: P' = P · M
const rad = (deg) => (deg * Math.PI) / 180;

export const identity = () => [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

export function multiply(A, B) {
  const C = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

export const chain = (...ms) => ms.reduce((acc, m) => multiply(acc, m), identity());

export function apply(M, p) {
  const v = [p.x, p.y, p.z, 1];
  const r = [0, 0, 0, 0];
  for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j] += v[k] * M[k][j];
  return { x: r[0] / r[3], y: r[1] / r[3], z: r[2] / r[3] };
}

export const translation = (dx, dy, dz) => [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [dx, dy, dz, 1],
];

export const scaling = (sx, sy, sz) => [
  [sx, 0, 0, 0],
  [0, sy, 0, 0],
  [0, 0, sz, 0],
  [0, 0, 0, 1],
];

export function rotationX(deg) {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [1, 0, 0, 0],
    [0, c, s, 0],
    [0, -s, c, 0],
    [0, 0, 0, 1],
  ];
}

export function rotationY(deg) {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [c, 0, -s, 0],
    [0, 1, 0, 0],
    [s, 0, c, 0],
    [0, 0, 0, 1],
  ];
}

export function rotationZ(deg) {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [c, s, 0, 0],
    [-s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

// Обертання навколо власної осі: переносимо центр тіла в початок координат, обертаємо, повертаємо назад
export function rotationAbout(c, ax, ay, az) {
  return chain(translation(-c.x, -c.y, -c.z), rotationX(ax), rotationY(ay), rotationZ(az), translation(c.x, c.y, c.z));
}

// Повне евклідове перетворення тіла: обертання навколо центру + зсув
export function bodyMatrix(center, tr) {
  return multiply(rotationAbout(center, tr.ax, tr.ay, tr.az), translation(tr.dx, tr.dy, tr.dz));
}
