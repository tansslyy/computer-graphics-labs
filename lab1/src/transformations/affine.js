/**
 * Пункти 3.2 і 3.3 завдання. Афінні перетворення.
 * Зберігають паралельність прямих, але не довжини й кути.
 */
import { Matrix3 } from '../math/matrix3.js';
import { translation } from './euclidean.js';

/**
 * Масштабування з коефіцієнтами kx, ky відносно точки (cx, cy):
 * M = T(−c) · S · T(c), де
 *
 *     S = | kx  0   0 |
 *         | 0   ky  0 |
 *         | 0   0   1 |
 */
export function scaling(kx, ky, cx, cy) {
  const s = new Matrix3([[kx, 0, 0], [0, ky, 0], [0, 0, 1]]);
  return translation(-cx, -cy).multiply(s).multiply(translation(cx, cy));
}

/**
 * Центральна симетрія відносно точки (sx, sy): P' = 2S − P.
 * Окремий випадок масштабування з kx = ky = −1.
 *
 *     | −1    0   0 |
 *     |  0   −1   0 |
 *     | 2sx  2sy  1 |
 */
export function pointSymmetry(sx, sy) {
  return new Matrix3([[-1, 0, 0], [0, -1, 0], [2 * sx, 2 * sy, 1]]);
}

/**
 * Афінна система координат: орти X = (Xx, Xy), Y = (Yx, Yy), початок O = (Ox, Oy).
 * Точка (x, y) переходить у O + x·X + y·Y.
 *
 *     | Xx  Xy  0 |
 *     | Yx  Yy  0 |
 *     | Ox  Oy  1 |
 */
export function affineSystem(Xx, Xy, Yx, Yy, Ox, Oy) {
  return new Matrix3([[Xx, Xy, 0], [Yx, Yy, 0], [Ox, Oy, 1]]);
}
