/**
 * Матриця 3x3 для однорідних координат.
 * Конвенція — рядок-вектор: [x' y' w] = [x y 1] · M, після чого x' /= w, y' /= w.
 * Тому a.multiply(b) означає «спочатку a, потім b».
 *
 * Конкретні перетворення зібрані в папці src/transformations.
 */
const EPS = 1e-9;

export class Matrix3 {
  constructor(rows) {
    this.m = rows.map((r) => [...r]);
  }

  static identity() {
    return new Matrix3([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  }

  multiply(other) {
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) r[i][j] += this.m[i][k] * other.m[k][j];
      }
    }
    return new Matrix3(r);
  }

  /** @returns {{x:number,y:number}|null} null — точка пішла за горизонт (w ≤ 0). */
  apply(p) {
    if (!p) return null;
    const { m } = this;
    const x = p.x * m[0][0] + p.y * m[1][0] + m[2][0];
    const y = p.x * m[0][1] + p.y * m[1][1] + m[2][1];
    const w = p.x * m[0][2] + p.y * m[1][2] + m[2][2];
    if (w <= EPS) return null;
    return { x: x / w, y: y / w };
  }

  format(title) {
    const f = (v) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(3).padStart(10);
    return `${title}\n${this.m.map((r) => `|${f(r[0])}${f(r[1])}${f(r[2])} |`).join('\n')}\n`;
  }
}
