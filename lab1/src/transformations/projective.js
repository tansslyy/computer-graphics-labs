/**
 * Пункт 3.4 завдання. Проективні перетворення.
 * Зберігають лише прямолінійність: паралельні прямі можуть перетинатися (перспектива).
 */
import { Matrix3 } from '../math/matrix3.js';

/**
 * Проективна система координат: орти X, Y, початок O та їхні ваги wX, wY, w0.
 *
 *     | Xx·wX  Xy·wX  wX |
 *     | Yx·wY  Yy·wY  wY |
 *     | Ox·w0  Oy·w0  w0 |
 *
 * Звідси:
 *     X' = (Ox·w0 + Xx·wX·x + Yx·wY·y) / (w0 + wX·x + wY·y)
 *     Y' = (Oy·w0 + Xy·wX·x + Yy·wY·y) / (w0 + wX·x + wY·y)
 *
 * Якщо знаменник ≤ 0, точка опиняється за лінією горизонту і не малюється.
 */
export function projectiveSystem(Xx, Xy, wX, Yx, Yy, wY, Ox, Oy, w0) {
  return new Matrix3([
    [Xx * wX, Xy * wX, wX],
    [Yx * wY, Yy * wY, wY],
    [Ox * w0, Oy * w0, w0],
  ]);
}
