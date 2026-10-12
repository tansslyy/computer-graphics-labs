/**
 * Пункт 3.1 завдання. Евклідові перетворення: зсув і обертання.
 * Зберігають відстані й кути — деталь лише переміщується.
 */
import { Matrix3 } from '../math/matrix3.js';

/**
 * Зсув на (dx, dy).
 *
 *     | 1   0   0 |
 *     | 0   1   0 |
 *     | dx  dy  1 |
 */
export function translation(dx, dy) {
  return new Matrix3([[1, 0, 0], [0, 1, 0], [dx, dy, 1]]);
}

/**
 * Обертання на кут α (градуси, проти годинникової стрілки) навколо точки (cx, cy).
 * Переносимо центр у початок координат, обертаємо, переносимо назад:
 * M = T(−c) · R(α) · T(c), де
 *
 *     R(α) = |  cos α   sin α   0 |
 *            | −sin α   cos α   0 |
 *            |    0       0     1 |
 */
export function rotation(angleDeg, cx, cy) {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const r = new Matrix3([[c, s, 0], [-s, c, 0], [0, 0, 1]]);
  return translation(-cx, -cy).multiply(r).multiply(translation(cx, cy));
}
