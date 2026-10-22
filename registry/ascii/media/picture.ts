import type { Rgb } from './colour';
import { functionFeed, type MediaFeed } from './feed';

/*
 * The picture an image shows when it's given none: three glossy spheres in the brand's violet and
 * rose, lit from the upper left, on nothing. It's drawn from a formula rather than shipped as a
 * file, so it is sharp at any size and the background is truly transparent.
 */

export const PICTURE_WIDTH = 640;
export const PICTURE_HEIGHT = 420;

interface Ball {
  x: number;
  y: number;
  /** Height toward the viewer. */
  z: number;
  r: number;
  /** Colour toward the light, and toward the shadow. */
  lit: Rgb;
  shade: Rgb;
  gloss: number;
}

const BALLS: Ball[] = [
  { x: 270, y: 215, z: 0, r: 158, lit: [0.62, 0.5, 1], shade: [0.42, 0.2, 0.86], gloss: 1 },
  { x: 452, y: 288, z: 120, r: 84, lit: [1, 0.48, 0.72], shade: [0.84, 0.16, 0.5], gloss: 1 },
  { x: 478, y: 104, z: -40, r: 40, lit: [0.84, 0.78, 1], shade: [0.46, 0.38, 0.82], gloss: 0.9 },
];

const norm = (v: number[]) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l) as Rgb;
};
/** Toward the key light: up, left and in front. Image y runs down. */
const KEY = norm([-0.55, -0.62, 0.56]);
/** A rose rim light from behind on the right. */
const RIM = norm([0.8, 0.2, -0.3]);
const RIM_COLOUR: Rgb = [1, 0.36, 0.66];
/** The half vector between the key and the viewer, for the highlight. */
const HALF = norm([KEY[0], KEY[1], KEY[2] + 1]);

/** Whether a ray from a point toward the key light hits another ball. */
function shadowed(px: number, py: number, pz: number, self: Ball) {
  for (const b of BALLS) {
    if (b === self) continue;
    const ox = px - b.x;
    const oy = py - b.y;
    const oz = pz - b.z;
    const along = ox * KEY[0] + oy * KEY[1] + oz * KEY[2];
    if (along > 0) continue;
    const d2 = ox * ox + oy * oy + oz * oz - along * along;
    if (d2 < b.r * b.r) return 1 - Math.sqrt(d2) / b.r;
  }
  return 0;
}

/** The default picture's colour at a pixel, into `out` as r, g, b, a from 0 to 1. */
export function picturePixel(x: number, y: number, out: Float32Array) {
  let hit: Ball | null = null;
  let top = -Infinity;
  let nz = 0;
  for (const b of BALLS) {
    const dx = (x - b.x) / b.r;
    const dy = (y - b.y) / b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) continue;
    const z = Math.sqrt(1 - d2);
    if (b.z + z * b.r > top) {
      top = b.z + z * b.r;
      hit = b;
      nz = z;
    }
  }
  if (!hit) {
    out[0] = out[1] = out[2] = out[3] = 0;
    return;
  }
  const nx = (x - hit.x) / hit.r;
  const ny = (y - hit.y) / hit.r;
  const lambert = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
  const shadow = shadowed(x, y, top, hit);
  const diffuse = lambert * (1 - 0.85 * Math.min(1, shadow * 3));
  const spec = Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), 48) * hit.gloss;
  const rim =
    Math.pow(Math.max(0, nx * RIM[0] + ny * RIM[1] + nz * RIM[2]), 2) *
    Math.pow(1 - nz, 1.2) *
    0.35;
  // A little light bounced from below, so the shadow side still has form.
  const fill = 0.04 + 0.06 * Math.max(0, ny);
  const t = Math.min(1, diffuse * 1.1);
  for (let c = 0; c < 3; c++) {
    const base = hit.shade[c]! + (hit.lit[c]! - hit.shade[c]!) * t;
    out[c] = Math.min(1, base * (fill + diffuse * 0.95) + spec * 0.9 + rim * RIM_COLOUR[c]!);
  }
  // Anti-aliased rim: the last sliver of the ball fades out.
  out[3] = Math.min(1, nz * 5);
}

/** The default picture as a feed. */
export const pictureFeed = (): MediaFeed =>
  functionFeed(PICTURE_WIDTH, PICTURE_HEIGHT, picturePixel);
