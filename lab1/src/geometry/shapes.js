/**
 * Примітиви у вигляді ламаних: { points: [{x,y}|null], style }.
 * Відрізки теж розбиваються на частини, щоб при проективному
 * перетворенні їх можна було коректно обрізати на горизонті.
 */
export const LineStyle = Object.freeze({
  MAIN: 'main',     // основна лінія
  HIDDEN: 'hidden', // штрихова — невидимий контур
  CENTER: 'center', // штрихпунктирна — осьова
  GRID: 'grid',
  AXIS: 'axis',
});

const SEGMENT_PARTS = 24;
const ARC_STEP = Math.PI / 90; // 2°

export function segment(x1, y1, x2, y2, style, parts = SEGMENT_PARTS) {
  const points = [];
  for (let i = 0; i <= parts; i++) {
    const t = i / parts;
    points.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return { points, style };
}

/** Дуга радіуса r з центром (cx, cy) від кута a1 до a2 (радіани). */
export function arc(cx, cy, r, a1, a2, style) {
  const n = Math.max(12, Math.ceil(Math.abs(a2 - a1) / ARC_STEP));
  const points = [];
  for (let i = 0; i <= n; i++) {
    const a = a1 + ((a2 - a1) * i) / n;
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return { points, style };
}

export function transformPolyline(polyline, matrix) {
  return { points: polyline.points.map((p) => matrix.apply(p)), style: polyline.style };
}
