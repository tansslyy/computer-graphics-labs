import { apply, bodyMatrix } from '../math/mat4.js';
import { projectionMatrix, viewMatrix } from '../math/projection.js';
import { buildDiamond } from '../model/diamond.js';

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

// Конвеєр: модель → евклідове перетворення W → поворот сцени V → проекція на y = p
export function computeScene(state) {
  const body = buildDiamond(state.params);
  const W = bodyMatrix(body.center, state.transform);
  const V = viewMatrix(state.proj.psi, state.proj.phi);
  const P = projectionMatrix(state.proj);

  const world = body.vertices.map((v) => apply(W, v));
  const view = world.map((v) => apply(V, v));
  const projected = world.map((v) => apply(P, v));

  const faces = body.faces.map((idx) => {
    const n = cross(sub(view[idx[1]], view[idx[0]]), sub(view[idx[2]], view[idx[0]]));
    const depth = idx.reduce((s, i) => s + view[i].y, 0) / idx.length;
    const len = Math.hypot(n.x, n.y, n.z) || 1;
    return { idx, visible: n.y < 0, depth, normal: { x: n.x / len, y: n.y / len, z: n.z / len } };
  });

  const center = apply(W, body.center);
  return { body, W, V, P, world, view, projected, faces, center };
}

export const projectPoint = (state, p) => apply(projectionMatrix(state.proj), p);
export const viewPoint = (state, p) => apply(viewMatrix(state.proj.psi, state.proj.phi), p);
