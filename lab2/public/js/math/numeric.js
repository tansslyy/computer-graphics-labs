export function simpson(f, a, b, n = 2000) {
  if (a === b) return 0;
  if (n % 2 === 1) n += 1;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (sum * h) / 3;
}

/** Площа багатокутника за формулою Гаусса (шнурування). */
export function shoelaceArea(points) {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}

/** Довжина ламаної, що апроксимує дугу. */
export function polylineLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++) {
    L += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return L;
}

export const degToRad = (deg) => (deg * Math.PI) / 180;
export const radToDeg = (rad) => (rad * 180) / Math.PI;
