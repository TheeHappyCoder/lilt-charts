/** A stable pseudo-random number in [0, 1) for an integer lattice point. */
export function hash3(x: number, y: number, z: number): number {
  let h =
    Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth value noise in [0, 1). */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const a = mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u);
  const b = mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u);
  const c = mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u);
  const d = mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u);
  return mix(mix(a, b, v), mix(c, d, v), w);
}

/** Layered noise in [0, 1): each octave doubles the detail and halves the weight. */
export function fbm3(x: number, y: number, z: number, octaves = 4): number {
  let sum = 0;
  let weight = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x, y, z) * weight;
    total += weight;
    weight *= 0.5;
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
  }
  return sum / total;
}

export const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent easing toward a target: `rate` is the share closed per second. */
export const approach = (current: number, target: number, rate: number, dt: number) =>
  target + (current - target) * Math.exp(-rate * dt);
