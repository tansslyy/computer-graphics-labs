import { apply, multiply, rotationX, rotationZ } from './mat4.js';

// Ізометрія: sin ψ = 1/√2 (ψ = 45°), sin φ = 1/√3 (φ ≈ 35.264°)
export const ISO = {
  psi: 45,
  phi: (Math.asin(1 / Math.sqrt(3)) * 180) / Math.PI,
};

// Ортографічне проекціювання на площину y = p
export const orthoY = (p) => [
  [1, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 1, 0],
  [0, p, 0, 1],
];

// Поворот сцени перед проекціюванням: спочатку навколо Z на ψ, потім навколо X на φ
export const viewMatrix = (psi, phi) => multiply(rotationZ(psi), rotationX(phi));

// M = Rz(ψ) · Rx(φ) · M_орт(y = p)
export const projectionMatrix = ({ psi, phi, p }) => multiply(viewMatrix(psi, phi), orthoY(p));

// Коефіцієнти спотворення вздовж осей: довжини проекцій одиничних векторів осей
export function distortion(proj) {
  const o = apply(proj, { x: 0, y: 0, z: 0 });
  const len = (q) => Math.hypot(q.x - o.x, q.z - o.z);
  const f = [
    len(apply(proj, { x: 1, y: 0, z: 0 })),
    len(apply(proj, { x: 0, y: 1, z: 0 })),
    len(apply(proj, { x: 0, y: 0, z: 1 })),
  ];
  const eq = (a, b) => Math.abs(a - b) < 1e-3;
  let kind = 'триметрія';
  if (f.some((v) => v < 1e-3)) kind = 'ортографічна';
  else if (eq(f[0], f[1]) && eq(f[1], f[2])) kind = 'ізометрія';
  else if (eq(f[0], f[1]) || eq(f[1], f[2]) || eq(f[0], f[2])) kind = 'диметрія';
  return { f, kind };
}
