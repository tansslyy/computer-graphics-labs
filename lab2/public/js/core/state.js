export const LIMITS = {
  a: { min: 0.5, max: 10, step: 0.05 },
  phiDeg: { min: -89.9, max: 89.9, step: 0.1 },
  animA: { min: 1, max: 6 }, // проміжок зміни a під час анімації, як у методичці: 1 ≤ a ≤ 6
};

export function defaultState() {
  return {
    a: 3, // масштабний параметр кривої
    phiDeg: 12, // параметр φ точки P, в якій будуються дотична й нормаль
    show: {
      grid: true,
      asymptotes: true,
      triangle: true,
      point: true,
      tangent: true,
      normal: true,
      segment: false,
    },
    transform: { dx: 0, dy: 0, px: 0, py: 0, angleDeg: 0 },
    view: { scale: 45, offsetX: 0, offsetY: 0 },
    animation: { a: false, point: false, speed: 1 },
  };
}
