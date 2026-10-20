export const TAU = Math.PI * 2;
export const normalizeAngle = angle => ((angle % TAU) + TAU) % TAU;

/** Segment centers, SVG fallback and Three camera share the top pointer. */
export function spinTarget(start, index, count) {
  if (!Number.isFinite(start) || !Number.isInteger(count) || count < 2 || !Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError('Invalid wheel spin');
  }
  return start + 4 * TAU + normalizeAngle(index * TAU / count - start);
}
export function indexAtPointer(angle, count) {
  return Math.round(normalizeAngle(angle) / TAU * count) % count;
}

/** Active elapsed time only: settings and hidden tabs cannot complete a spin. */
export class SpinClock {
  constructor({ from, to, duration, now }) {
    this.from = from; this.to = to; this.duration = duration;
    this.elapsed = 0; this.last = now; this.paused = false;
  }
  sample(now) {
    if (!this.paused) this.elapsed += Math.max(0, now - this.last);
    this.last = now;
    const progress = Math.min(1, this.elapsed / this.duration);
    return { angle: this.from + (this.to - this.from) * (1 - (1 - progress) ** 4), done: progress === 1 };
  }
  pause(now) { this.sample(now); this.paused = true; }
  resume(now) { this.last = now; this.paused = false; }
}
