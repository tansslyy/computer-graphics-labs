import { simpson, shoelaceArea } from './numeric.js';

const SQRT3 = Math.sqrt(3);
const SINGULAR_EPS = 1e-9;

/** Вершини гілок: середини інтервалів між розривами. */
export const BRANCH_VERTICES = [-Math.PI / 3, 0, Math.PI / 3];

/** Інтервали параметра для кожної гілки. */
export const BRANCH_INTERVALS = [
  [-Math.PI / 2, -Math.PI / 6],
  [-Math.PI / 6, Math.PI / 6],
  [Math.PI / 6, Math.PI / 2],
];

export class LongchampsTrisectrix {
  constructor(a = 3) {
    this.a = a;
  }

  r(phi) {
    const c = Math.cos(3 * phi);
    if (Math.abs(c) < SINGULAR_EPS) return NaN;
    return this.a / c;
  }

  /** r'(φ) = 3a·sin3φ / cos²3φ */
  dr(phi) {
    const c = Math.cos(3 * phi);
    return (3 * this.a * Math.sin(3 * phi)) / (c * c);
  }

  /** r''(φ) = 9a(1 + sin²3φ) / cos³3φ */
  d2r(phi) {
    const c = Math.cos(3 * phi);
    const s = Math.sin(3 * phi);
    return (9 * this.a * (1 + s * s)) / (c * c * c);
  }

  /** Точка кривої для параметра φ (формули (2), (4) методички). null — точка у нескінченності. */
  point(phi) {
    const r = this.r(phi);
    if (!Number.isFinite(r)) return null;
    return { x: r * Math.cos(phi), y: r * Math.sin(phi) };
  }

  /** Похідні x'(φ), y'(φ) — для дотичної, формули (11), (12). */
  derivative(phi) {
    const r = this.r(phi);
    const dr = this.dr(phi);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    return { dx: dr * c - r * s, dy: dr * s + r * c };
  }

  /** Другі похідні x''(φ), y''(φ). */
  secondDerivative(phi) {
    const r = this.r(phi);
    const dr = this.dr(phi);
    const d2r = this.d2r(phi);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    return {
      ddx: d2r * c - 2 * dr * s - r * c,
      ddy: d2r * s + 2 * dr * c - r * s,
    };
  }

  // ---------- гілки та дискретизація ----------

  /** Номер гілки (0, 1, 2) і її вершина для параметра φ ∈ (−π/2, π/2). */
  static branchOf(phi) {
    const idx = BRANCH_INTERVALS.findIndex(([lo, hi]) => phi > lo && phi < hi);
    return idx === -1 ? null : { index: idx, vertex: BRANCH_VERTICES[idx] };
  }

  branches(rMax, samplesPerBranch = 1200) {
    const half = Math.acos(Math.min(1, Math.abs(this.a) / rMax)) / 3;
    return BRANCH_VERTICES.map((vertex) => {
      const pts = [];
      for (let i = 0; i <= samplesPerBranch; i++) {
        const phi = vertex - half + (2 * half * i) / samplesPerBranch;
        const p = this.point(phi);
        if (p) pts.push(p);
      }
      return pts;
    });
  }

  // ---------- асимптоти ----------

  asymptotes() {
    const a = this.a;
    const b = (2 * a) / (3 * SQRT3);
    return [
      { label: `x = ${fmt(-a / 3)}`, point: { x: -a / 3, y: 0 }, dir: { x: 0, y: 1 } },
      { label: `y = ${fmt(1 / SQRT3)}·x ${sign(-b)} ${fmt(Math.abs(b))}`, point: { x: 0, y: -b }, dir: unit(1, 1 / SQRT3) },
      { label: `y = ${fmt(-1 / SQRT3)}·x ${sign(b)} ${fmt(Math.abs(b))}`, point: { x: 0, y: b }, dir: unit(1, -1 / SQRT3) },
    ];
  }

  /** Вершини асимптотичного трикутника. */
  asymptoticTriangle() {
    const a = this.a;
    return [
      { x: (2 * a) / 3, y: 0 },
      { x: -a / 3, y: a / SQRT3 },
      { x: -a / 3, y: -a / SQRT3 },
    ];
  }

  /** Площа асимптотичного трикутника: аналітично a²/√3 і для перевірки — за формулою Гаусса. */
  triangleArea() {
    return {
      analytic: (this.a * this.a) / SQRT3,
      numeric: shoelaceArea(this.asymptoticTriangle()),
    };
  }


  areaBetweenBranchAndAsymptotes(samples = 20000) {
    const a = this.a;
    const delta = Math.PI / 6 - 1e-5;
    const polygon = [{ x: (2 * a) / 3, y: 0 }];
    for (let i = 0; i <= samples; i++) {
      // згущуємо точки біля кінців, де крива йде далеко
      const u = -1 + (2 * i) / samples;
      const phi = delta * Math.sin((u * Math.PI) / 2);
      polygon.push(this.point(phi));
    }
    return { analytic: (a * a) / (3 * SQRT3), numeric: shoelaceArea(polygon) };
  }

  // ---------- характеристики в точці ----------

  /** Знакова кривина k(φ) = (x'y'' − y'x'') / (x'² + y'²)^(3/2). */
  curvature(phi) {
    const { dx, dy } = this.derivative(phi);
    const { ddx, ddy } = this.secondDerivative(phi);
    return (dx * ddy - dy * ddx) / Math.pow(dx * dx + dy * dy, 1.5);
  }

  curvatureRadiusAnalytic(phi) {
    const c = Math.cos(3 * phi);
    const t = Math.tan(3 * phi);
    return (Math.abs(this.a / c) * Math.pow(1 + 9 * t * t, 1.5)) / 8;
  }

  /** Елемент довжини дуги в полярних координатах, формула (20): √(r² + r'²). */
  arcElement(phi) {
    const r = this.r(phi);
    const dr = this.dr(phi);
    return Math.sqrt(r * r + dr * dr);
  }

  /** Довжина дуги між двома значеннями параметра однієї гілки (метод Сімпсона). */
  arcLength(phi1, phi2, n = 4000) {
    const [lo, hi] = phi1 < phi2 ? [phi1, phi2] : [phi2, phi1];
    return simpson((p) => this.arcElement(p), lo, hi, n);
  }

  sectorArea(phi) {
    const branch = LongchampsTrisectrix.branchOf(phi);
    if (!branch) return null;
    const psi = phi - branch.vertex;
    const a2 = this.a * this.a;
    return {
      analytic: (a2 / 6) * Math.abs(Math.tan(3 * psi)),
      numeric: simpson((p) => 0.5 * this.r(p) ** 2, Math.min(phi, branch.vertex), Math.max(phi, branch.vertex), 4000),
    };
  }

  segmentArea(phi, samples = 2000) {
    const branch = LongchampsTrisectrix.branchOf(phi);
    if (!branch) return null;
    const psi = Math.abs(phi - branch.vertex);
    const a2 = this.a * this.a;
    const c3 = Math.cos(3 * psi);
    const analytic = (a2 * Math.sin(psi) * Math.cos(psi)) / (c3 * c3) - (a2 / 3) * Math.tan(3 * psi);

    const polygon = [];
    for (let i = 0; i <= samples; i++) {
      const p = this.point(branch.vertex - psi + (2 * psi * i) / samples);
      if (p) polygon.push(p);
    }
    return { analytic, numeric: shoelaceArea(polygon) };
  }

  inflectionPoints(samplesPerBranch = 4000) {
    const result = [];
    const margin = 1e-3;
    for (const [lo, hi] of BRANCH_INTERVALS) {
      let prevSign = null;
      let prevPhi = null;
      for (let i = 0; i <= samplesPerBranch; i++) {
        const phi = lo + margin + ((hi - lo - 2 * margin) * i) / samplesPerBranch;
        const k = this.curvature(phi);
        if (!Number.isFinite(k)) continue;
        const s = Math.sign(k);
        if (prevSign !== null && s !== 0 && s !== prevSign) {
          result.push(this.point((phi + prevPhi) / 2));
        }
        prevSign = s;
        prevPhi = phi;
      }
    }
    return result;
  }
}

function unit(x, y) {
  const l = Math.hypot(x, y);
  return { x: x / l, y: y / l };
}

function fmt(v) {
  const s = Number(v.toFixed(4)).toString();
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

function sign(v) {
  return v < 0 ? '−' : '+';
}
