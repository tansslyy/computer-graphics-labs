export const identity = () => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// Паралельне перенесення
export const translation = (dx, dy) => [
  [1, 0, 0],
  [0, 1, 0],
  [dx, dy, 1],
];

// Обертання на кут alpha навколо точки (px, py)
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

// [x y 1] · M
export function applyToPoint(M, p) {
  return {
    x: p.x * M[0][0] + p.y * M[1][0] + M[2][0],
    y: p.x * M[0][1] + p.y * M[1][1] + M[2][1],
  };
}

export function invertAffine(M) {
  const [[a, b], [c, d], [e, f]] = M;
  const det = a * d - b * c;
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  return [
    [ia, ib, 0],
    [ic, id, 0],
    [-(e * ia + f * ic), -(e * ib + f * id), 1],
  ];
}

export function sceneMatrix({ dx, dy, px, py, angleDeg }) {
  const alpha = (angleDeg * Math.PI) / 180;
  return multiply(rotationAbout(px, py, alpha), translation(dx, dy));
}
