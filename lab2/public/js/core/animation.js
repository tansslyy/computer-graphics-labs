import { LIMITS } from './state.js';

const A_STEP = 0.03; // зміна a за один кадр при швидкості 1
const PHI_STEP = 0.35; // зміна φ (у градусах) за один кадр при швидкості 1

export class Animator {
  constructor() {
    this.direction = 1;
  }

  /** Один кадр анімації. Повертає true, якщо стан змінився і сцену треба перемалювати. */
  step(state) {
    const { animation } = state;
    let changed = false;

    if (animation.a) {
      const { min, max } = LIMITS.animA;
      if (state.a >= max) this.direction = -1; // досягли верхньої межі — зменшуємо
      if (state.a <= min) this.direction = 1; // досягли нижньої межі — збільшуємо
      state.a = clamp(state.a + this.direction * A_STEP * animation.speed, min, max);
      changed = true;
    }

    if (animation.point) {
      let phi = state.phiDeg + PHI_STEP * animation.speed;
      if (phi > LIMITS.phiDeg.max) phi = LIMITS.phiDeg.min; // крива має період π по φ
      state.phiDeg = phi;
      changed = true;
    }
    return changed;
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
