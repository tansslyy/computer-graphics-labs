/**
 * Малює ламані на Canvas. Відповідає тільки за перехід «світові координати (мм) → пікселі»:
 * screenX = originX + x · density, screenY = originY − y · density (вісь Y дивиться вгору).
 */
const STYLES = {
  main:   { color: '--ink',   width: 2.2, dash: [] },
  hidden: { color: '--ink',   width: 1.3, dash: [6, 4] },
  center: { color: '--muted', width: 1,   dash: [14, 4, 2, 4] },
  grid:   { color: '--grid',  width: 1,   dash: [] },
  axis:   { color: '--ink',   width: 1.5, dash: [] },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.density = 3;   // пікселів на 1 мм
    this.originX = 60;  // екранні координати точки (0, 0)
    this.originY = 600;
    this.fitted = false;
  }

  get width() { return this.canvas.clientWidth; }
  get height() { return this.canvas.clientHeight; }

  /** Підганяє розмір буфера під розмір елемента з урахуванням devicePixelRatio. */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Вписує сітку розміром gridSize мм у вікно. */
  fit(gridSize) {
    this.density = Math.min(this.width, this.height) / (gridSize + 60);
    this.originX = (this.width - gridSize * this.density) / 2;
    this.originY = (this.height + gridSize * this.density) / 2;
    this.fitted = true;
  }

  pan(dx, dy) {
    this.originX += dx;
    this.originY += dy;
  }

  zoom(factor, mx, my) {
    const wx = (mx - this.originX) / this.density;
    const wy = (this.originY - my) / this.density;
    this.density = Math.min(60, Math.max(0.2, this.density * factor));
    this.originX = mx - wx * this.density;
    this.originY = my + wy * this.density;
  }

  clear() {
    const { ctx } = this;
    ctx.fillStyle = css('--bg');
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = '11px ui-monospace, Consolas, Menlo, monospace';
  }

  toScreen(p) {
    return p ? { x: this.originX + p.x * this.density, y: this.originY - p.y * this.density } : null;
  }

  stroke(polyline) {
    const { ctx } = this;
    const st = STYLES[polyline.style];
    ctx.strokeStyle = css(st.color);
    ctx.lineWidth = st.width;
    ctx.setLineDash(st.dash);
    ctx.beginPath();
    let pen = false;
    let prev = null;
    for (const p of polyline.points) {
      const q = this.toScreen(p);
      if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y) || Math.abs(q.x) > 1e6 || Math.abs(q.y) > 1e6) {
        pen = false;
        continue;
      }
      if (pen && Math.hypot(q.x - prev.x, q.y - prev.y) > 4000) pen = false; // стрибок через горизонт
      if (pen) ctx.lineTo(q.x, q.y);
      else { ctx.moveTo(q.x, q.y); pen = true; }
      prev = q;
    }
    ctx.stroke();
  }

  /** Стрілка на кінці осі. */
  arrow(axis, label) {
    const ok = axis.points.map((p) => this.toScreen(p)).filter(Boolean);
    if (ok.length < 2) return;
    const b = ok[ok.length - 1];
    const a = ok[ok.length - 2];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const { ctx } = this;
    ctx.setLineDash([]);
    ctx.strokeStyle = css('--ink');
    ctx.fillStyle = css('--ink');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x - 10 * Math.cos(ang - 0.4), b.y - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x - 10 * Math.cos(ang + 0.4), b.y - 10 * Math.sin(ang + 0.4));
    ctx.stroke();
    ctx.fillText(label, b.x + 8 * Math.cos(ang) + 4, b.y + 8 * Math.sin(ang) + 4);
  }

  label(p, text, offX, offY) {
    const q = this.toScreen(p);
    if (!q) return;
    this.ctx.fillStyle = css('--muted');
    this.ctx.fillText(text, q.x + offX, q.y + offY);
  }

  marker(p, colorVar, text) {
    const q = this.toScreen(p);
    if (!q) return;
    const { ctx } = this;
    ctx.fillStyle = css(colorVar);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(text, q.x + 7, q.y - 6);
  }
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
