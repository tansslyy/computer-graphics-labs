/**
 * Деталь варіанту 4.
 *
 * Локальна система: центр дуги R1 у (0, 0), вісь симетрії деталі — вісь X.
 * Усі точки обчислюються з параметрів, тому при зміні будь-якого розміру
 * сусідні елементи автоматично залишаються з'єднаними.
 *
 *  (0,R1) _______________________ (xb,h) ______ (L,h)
 *        /        похила лінія           |      |
 *  R1   (  ------ ребро y = +S/2 ------- |      |
 *   R2 )|                                |      |  стояк B x H
 *       (  ------ ребро y = -S/2 ------- |      |
 *        \_______________________ (xb,-h)|______|
 *  (0,-R1)                                      (L,-h)
 */
import { translation } from '../transformations/euclidean.js';
import { LineStyle, arc, segment, transformPolyline } from './shapes.js';

const { MAIN, HIDDEN, CENTER } = LineStyle;

/** Будує деталь і ставить центр дуги R1 у точку (placeX, placeY). */
export function buildDetail({ L, B, H, R1, R2, S, T }, placeX = 0, placeY = 0) {
  const xb = L - B;                         // ліва грань стояка
  const h = H / 2;
  const s = S / 2;
  const xs = Math.sqrt(R1 * R1 - s * s);    // де ребро торкається дуги R1
  const a0 = Math.asin(s / R1);             // кут розриву дуги R1 під ребро
  const half = Math.PI / 2;

  const parts = [
    // осьові лінії
    segment(-8, 0, L + 8, 0, CENTER),
    segment(0, -R2 - 6, 0, R2 + 6, CENTER),

    // зовнішній контур
    segment(0, R1, xb, h, MAIN),            // верхня похила лінія
    segment(xb, h, L, h, MAIN),             // верх стояка
    segment(L, h, L, -h, MAIN),             // права грань
    segment(L, -h, xb, -h, MAIN),           // низ стояка
    segment(xb, -h, 0, -R1, MAIN),          // нижня похила лінія
    segment(0, R1, 0, R2, MAIN),            // ліва грань, верхня частина
    segment(0, -R2, 0, -R1, MAIN),          // ліва грань, нижня частина

    // дуги
    arc(0, 0, R2, half, -half, MAIN),       // отвір R2
    arc(0, 0, R1, half, a0, MAIN),          // R1 зверху до ребра
    arc(0, 0, R1, -a0, -half, MAIN),        // R1 від ребра донизу

    // ребро шириною S
    segment(xs, s, xb, s, MAIN),
    segment(xs, -s, xb, -s, MAIN),

    // ліва грань стояка з проходом під ребро
    segment(xb, h, xb, s, MAIN),
    segment(xb, -s, xb, -h, MAIN),
  ];

  // приховані лінії в стояку
  if (T > 0 && T < h) {
    parts.push(segment(xb, h - T, L, h - T, HIDDEN));
    parts.push(segment(xb, -(h - T), L, -(h - T), HIDDEN));
  }

  const place = translation(placeX, placeY);
  return parts.map((p) => transformPolyline(p, place));
}
