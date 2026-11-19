import { applyToPoint, applyToVector } from '../math/matrix.js';
import { LongchampsTrisectrix } from '../math/trisectrix.js';

export function analyse(curve, state, M) {
  const phi = (state.phiDeg * Math.PI) / 180;
  const branch = LongchampsTrisectrix.branchOf(phi);
  const P = curve.point(phi);

  const info = {
    asymptotes: curve.asymptotes().map((l) => l.label),
    triangleArea: curve.triangleArea(),
    branchArea: curve.areaBetweenBranchAndAsymptotes(),
    inflections: curve.inflectionPoints().length,
    minRadius: Math.abs(curve.a) / 8,
    matrix: M,
    point: null,
  };

  if (!P || !branch) return info;

  // дотична/нормаль — у координатах сцени, тобто після евклідових перетворень
  const Pw = applyToPoint(M, P);
  const d = curve.derivative(phi);
  const t = applyToVector(M, { x: d.dx, y: d.dy });

  info.point = {
    branch: branch.index + 1,
    local: P,
    world: Pw,
    tangent: lineEquation(Pw, t),
    normal: lineEquation(Pw, { x: -t.y, y: t.x }),
    radius: curve.curvatureRadiusAnalytic(phi),
    radiusNumeric: 1 / Math.abs(curve.curvature(phi)),
    arcLength: curve.arcLength(branch.vertex, phi),
    sector: curve.sectorArea(phi),
    segment: curve.segmentArea(phi),
  };
  return info;
}

/** Рівняння прямої через точку P з напрямним вектором v: y = y0 + k(x − x0) або x = x0. */
function lineEquation(P, v) {
  if (Math.abs(v.x) < 1e-9 * Math.hypot(v.x, v.y)) return `x = ${f(P.x)}`;
  const k = v.y / v.x;
  const b = P.y - k * P.x;
  return `y = ${f(k)}·x ${b < 0 ? '−' : '+'} ${f(Math.abs(b))}`;
}

export const f = (v, digits = 4) => {
  if (!Number.isFinite(v)) return '∞';
  const s = Number(v.toFixed(digits)).toString();
  return s.startsWith('-') ? '−' + s.slice(1) : s;
};
