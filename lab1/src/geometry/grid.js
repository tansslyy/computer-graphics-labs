/** Координатна сітка і осі. Перетворюються разом із системою координат. */
import { LineStyle, segment } from './shapes.js';

const PARTS = 40;

export function gridLines(size, step) {
  const lines = [];
  for (let i = 0; i <= size; i += step) {
    lines.push(segment(i, 0, i, size, LineStyle.GRID, PARTS));
    lines.push(segment(0, i, size, i, LineStyle.GRID, PARTS));
  }
  return lines;
}

export const axisX = (size) => segment(-6, 0, size + 14, 0, LineStyle.AXIS, PARTS);
export const axisY = (size) => segment(0, -6, 0, size + 14, LineStyle.AXIS, PARTS);
