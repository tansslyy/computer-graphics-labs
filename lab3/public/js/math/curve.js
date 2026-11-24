// Крива другого порядку в інженерному вигляді, формула (1.1)
export function engineeringPoint(A, B, C, w, u) {
  const [wA, wB, wC] = w;
  const a = wA * (1 - u) ** 2;
  const b = 2 * wB * u * (1 - u);
  const c = wC * u ** 2;
  const d = a + b + c;
  return {
    x: (A.x * a + B.x * b + C.x * c) / d,
    y: (A.y * a + B.y * b + C.y * c) / d,
  };
}

export function sampleSegment(A, B, C, w, steps = 40) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(engineeringPoint(A, B, C, w, i / steps));
  return pts;
}

export function segmentCount(contour) {
  return contour.ctrl.length;
}

export function segmentPoints(contour, i) {
  const n = contour.nodes.length;
  return {
    A: contour.nodes[i],
    B: contour.ctrl[i],
    C: contour.nodes[(i + 1) % n],
    w: contour.weights[i],
  };
}

export function sampleContour(contour, steps = 40) {
  const out = [];
  for (let i = 0; i < segmentCount(contour); i++) {
    const { A, B, C, w } = segmentPoints(contour, i);
    const pts = sampleSegment(A, B, C, w, steps);
    out.push(...(i ? pts.slice(1) : pts));
  }
  return out;
}

// Тип дуги: зводимо ваги до вигляду wA = wC = 1, тоді f = wB / (1 + wB)
export function arcType(w) {
  const [wA, wB, wC] = w;
  const k = wB / Math.sqrt(wA * wC);
  const f = k / (1 + k);
  let type = 'парабола';
  if (Math.abs(f - 0.5) > 1e-6) type = f < 0.5 ? 'еліпс' : 'гіпербола';
  return { k, f, type };
}

// Вага, з якою дуга на центральний кут 2θ є дугою кола: wB = cos θ
export const circleWeight = (halfAngle) => Math.cos(halfAngle);
