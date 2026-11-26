// Огранений діамант: майданчик (верхня грань), коронка з трикутних граней, рундист, павільйон і калета
export const DEFAULT_PARAMS = {
  n: 12,
  radius: 50,
  table: 0.55,
  crown: 20,
  pavilion: 55,
  scale: 1,
};

export function buildDiamond(params) {
  const { n, radius, table, crown, pavilion, scale } = params;
  const R = radius * scale;
  const H = crown * scale;
  const D = pavilion * scale;
  const step = (2 * Math.PI) / n;

  const vertices = [];
  for (let i = 0; i < n; i++) vertices.push({ x: R * Math.cos(i * step), y: R * Math.sin(i * step), z: 0 });
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) * step;
    vertices.push({ x: R * table * Math.cos(a), y: R * table * Math.sin(a), z: H });
  }
  vertices.push({ x: 0, y: 0, z: -D });

  const g = (i) => i % n;
  const t = (i) => n + (i % n);
  const culet = 2 * n;

  const faces = [];
  faces.push(Array.from({ length: n }, (_, i) => t(i)));
  for (let i = 0; i < n; i++) {
    faces.push([g(i), g(i + 1), t(i)]);
    faces.push([t(i), g(i + 1), t(i + 1)]);
    faces.push([g(i + 1), g(i), culet]);
  }

  const edges = [];
  const seen = new Set();
  for (const f of faces) {
    f.forEach((a, k) => {
      const b = f[(k + 1) % f.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    });
  }

  const center = { x: 0, y: 0, z: (H - D) / 2 };
  return { vertices, faces, edges, center };
}
