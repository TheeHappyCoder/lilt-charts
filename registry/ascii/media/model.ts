import { scrambled } from '../charts/chart-kit';
import { ramp } from '../engine/glyphs';
import { approach, clamp, hash3 } from '../engine/noise';
import type { GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';
import { mixRgb, parseColour, toHex, type Rgb } from './colour';
import { faceted, shapeSolid, type Mesh, type ModelShape, type Solid } from './meshes';

export interface ModelOptions {
  /** A built-in shape. Default `torus`. */
  shape?: ModelShape;
  /** A mesh of your own, drawn instead of the shape. */
  mesh?: Mesh;
  /** `blocks` draws a solid lit body with a glyph cut in; `glyphs` draws it in type alone. Default `blocks`. */
  mode?: 'blocks' | 'glyphs';
  /** The body's colour, as a hex colour. Default violet. */
  color?: string;
  /** Turns a minute, on its own. Default 6. */
  spin?: number;
  /** Share of the frame's shorter side the model spans. Default 0.86. */
  size?: number;
}

const DEEP = 0;
const FIRST = 1;
/** Steps from deep shadow to the highlight. */
const SHADES = 18;
/** Seconds before the reduced-motion still. */
const SETTLE = 1.2;
/** How far the camera stands from the model's centre, in model radii. */
const CAMERA = 5;

/** Cut into the lit body: none where the light falls full, denser into the shadow. */
const CUTS = '.:-=+*#';
const EDGE = '.:';
/** donut.c's ramp, for the body in type alone. */
const DONUT = '.,-~:;=!*#$@';

const unit = (x: number, y: number, z: number): [number, number, number] => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
/** Toward the key light, in view space: y up, the viewer down -z. Up, left and in front. */
const LIGHT = unit(-0.5, 0.62, -0.6);
/** Halfway between the light and the viewer, for the highlight. */
const HALF = unit(LIGHT[0], LIGHT[1], LIGHT[2] - 1);
const ROSE: Rgb = [0.9, 0.28, 0.61];

/** The scene's lit shades of a colour: shadow warms toward rose; the highlight runs to white. */
export function shadesOf(colour: Rgb, count = SHADES): string[] {
  const shadow = mixRgb(colour, ROSE, 0.45).map((c) => c * 0.16) as Rgb;
  return Array.from({ length: count }, (_, k) => {
    const lum = (k / (count - 1)) * 1.3;
    if (lum <= 0.85) return toHex(mixRgb(shadow, colour, Math.pow(lum / 0.85, 0.9)));
    return toHex(mixRgb(colour, [1, 1, 1], ((lum - 0.85) / 0.45) * 0.88));
  });
}

/**
 * A 3D model drawn in type, as donut.c did, but solid. Each frame the mesh is turned, projected
 * and rasterised into a few samples per cell with a depth buffer; each sample is lit with a key
 * light and a highlight. A cell's samples give its shade and how much of it the model covers, so
 * the silhouette steps down through lighter glyphs instead of a staircase. It turns on its own,
 * leans toward the pointer, and spins faster when clicked.
 */
export function createModel(options: ModelOptions = {}): AsciiScene {
  const solid: Solid = options.mesh ? faceted(options.mesh) : shapeSolid(options.shape ?? 'torus');
  const mode = options.mode ?? 'blocks';
  const base = parseColour(options.color, [0.545, 0.424, 1]);
  const spin = ((options.spin ?? 6) / 60) * Math.PI * 2;
  const size = clamp(options.size ?? 0.86, 0.2, 1);
  const vertexCount = solid.position.length / 3;
  const view = new Float32Array(vertexCount * 3);
  const viewNormal = new Float32Array(vertexCount * 3);
  const screen = new Float32Array(vertexCount * 2);

  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let sx = 2;
  let sy = 3;
  let width = 0;
  let height = 0;
  let depth = new Float32Array(0);
  let light = new Float32Array(0);
  let winner = new Int32Array(0);
  let bary0 = new Float32Array(0);
  let bary1 = new Float32Array(0);
  let time = 0;
  // Start so that at `settle`, where a reduced-motion still is taken, it sits three-quarters on.
  let turn = 0.4 - spin * SETTLE;
  let roll = 0.55 - spin * 0.42 * SETTLE;
  let speed = spin;
  let leanX = 0;
  let leanY = 0;

  function project() {
    const { cols, rows, aspect } = grid;
    const w = cols;
    const h = rows * aspect;
    // Turn about the vertical, roll about the model's own axis, and lean as the pointer asks.
    const a = turn + leanX;
    const b = roll;
    const c = 0.38 + leanY;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cb = Math.cos(b);
    const sb = Math.sin(b);
    const cc = Math.cos(c);
    const sc = Math.sin(c);
    const camera = CAMERA;
    // The model is a unit sphere at most; perspective swells its near side by up to this much.
    const swell = camera / (camera - 1);
    const radius = (Math.min(w, h) * size) / 2 / swell;
    const focal = radius * camera;
    const cx = w / 2;
    const cy = h / 2;
    const { position, normal } = solid;
    const turnVec = (x: number, y: number, z: number, out: Float32Array, k: number) => {
      // Roll about x, then turn about y, then lean about x toward the viewer.
      const y1 = y * cb - z * sb;
      const z1 = y * sb + z * cb;
      const x2 = x * ca + z1 * sa;
      const z2 = -x * sa + z1 * ca;
      const y3 = y1 * cc - z2 * sc;
      const z3 = y1 * sc + z2 * cc;
      out[k] = x2;
      out[k + 1] = y3;
      out[k + 2] = z3;
    };
    for (let i = 0; i < vertexCount; i++) {
      const k = i * 3;
      turnVec(position[k]!, position[k + 1]!, position[k + 2]!, view, k);
      turnVec(normal[k]!, normal[k + 1]!, normal[k + 2]!, viewNormal, k);
      const s = focal / (camera + view[k + 2]!);
      // Into sample units: sx samples across a cell, sy down it.
      screen[i * 2] = (cx + view[k]! * s) * sx;
      screen[i * 2 + 1] = ((cy - view[k + 1]! * s) / aspect) * sy;
    }
  }

  /**
   * Fills the depth buffer, remembering for each sample only which triangle won and where in it:
   * shading waits until every triangle is in, so hidden surfaces cost no lighting.
   */
  function rasterise() {
    depth.fill(Infinity);
    const tris = solid.triangles;
    const { winding } = solid;
    for (let t = 0; t < tris.length; t += 3) {
      const i0 = tris[t]!;
      const i1 = tris[t + 1]!;
      const i2 = tris[t + 2]!;
      const x0 = screen[i0 * 2]!;
      const y0 = screen[i0 * 2 + 1]!;
      const x1 = screen[i1 * 2]!;
      const y1 = screen[i1 * 2 + 1]!;
      const x2 = screen[i2 * 2]!;
      const y2 = screen[i2 * 2 + 1]!;
      if (winding) {
        // A closed solid's faces turned away from the camera are hidden behind its front: skip them.
        const ax = view[i1 * 3]! - view[i0 * 3]!;
        const ay = view[i1 * 3 + 1]! - view[i0 * 3 + 1]!;
        const az = view[i1 * 3 + 2]! - view[i0 * 3 + 2]!;
        const bx = view[i2 * 3]! - view[i0 * 3]!;
        const by = view[i2 * 3 + 1]! - view[i0 * 3 + 1]!;
        const bz = view[i2 * 3 + 2]! - view[i0 * 3 + 2]!;
        const facing =
          (ay * bz - az * by) * view[i0 * 3]! +
          (az * bx - ax * bz) * view[i0 * 3 + 1]! +
          (ax * by - ay * bx) * (view[i0 * 3 + 2]! + CAMERA);
        if (facing * winding > 0) continue;
      }
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (Math.abs(area) < 1e-9) continue;
      const inv = 1 / area;
      const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2)));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minX > maxX || minY > maxY) continue;
      const z0 = view[i0 * 3 + 2]!;
      const z1 = view[i1 * 3 + 2]!;
      const z2 = view[i2 * 3 + 2]!;
      for (let y = minY; y <= maxY; y++) {
        const py = y + 0.5;
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * inv;
          if (w0 < 0) continue;
          const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * inv;
          if (w1 < 0 || w0 + w1 > 1) continue;
          const z = w0 * z0 + w1 * z1 + (1 - w0 - w1) * z2;
          const s = y * width + x;
          if (z >= depth[s]!) continue;
          depth[s] = z;
          winner[s] = t;
          bary0[s] = w0;
          bary1[s] = w1;
        }
      }
    }
  }

  /** Lights each visible sample: a key light, a highlight, a rim, and a little depth. */
  function shade() {
    const tris = solid.triangles;
    const { uv, lines } = solid;
    for (let s = 0; s < depth.length; s++) {
      const z = depth[s]!;
      if (z === Infinity) continue;
      const t = winner[s]!;
      const i0 = tris[t]! * 3;
      const i1 = tris[t + 1]! * 3;
      const i2 = tris[t + 2]! * 3;
      const w0 = bary0[s]!;
      const w1 = bary1[s]!;
      const w2 = 1 - w0 - w1;
      let nx = w0 * viewNormal[i0]! + w1 * viewNormal[i1]! + w2 * viewNormal[i2]!;
      let ny = w0 * viewNormal[i0 + 1]! + w1 * viewNormal[i1 + 1]! + w2 * viewNormal[i2 + 1]!;
      let nz = w0 * viewNormal[i0 + 2]! + w1 * viewNormal[i1 + 2]! + w2 * viewNormal[i2 + 2]!;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      // Whichever way a face was wound, the side we see faces us.
      const flip = nz > 0 ? -1 / l : 1 / l;
      nx *= flip;
      ny *= flip;
      nz *= flip;
      const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      let spec = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
      // To the 32nd power by squaring: far cheaper than Math.pow per sample.
      spec *= spec;
      spec *= spec;
      spec *= spec;
      spec *= spec;
      spec *= spec;
      // Light from behind catches the rim and lifts it off the background.
      const back = 1 + nz;
      const rim = back * back * back * 0.18;
      // Farther parts fall a little darker, so overlaps read front to back.
      let lit = (0.07 + diffuse * 0.82 + rim + spec * 0.55) * (1 - 0.16 * z);
      if (lines) {
        // Lines of latitude and longitude, cut in as grooves, so a turning sphere shows it.
        const a = (i0 / 3) * 2;
        const b = (i1 / 3) * 2;
        const c = (i2 / 3) * 2;
        const u = (w0 * uv[a]! + w1 * uv[b]! + w2 * uv[c]!) * lines[0];
        const v = (w0 * uv[a + 1]! + w1 * uv[b + 1]! + w2 * uv[c + 1]!) * lines[1];
        if (Math.abs(u - Math.round(u)) < 0.07 || Math.abs(v - Math.round(v)) < 0.07) lit *= 0.58;
      }
      light[s] = lit;
    }
  }

  return {
    palette: ['#0b0b12', ...shadesOf(base)],
    lineHeight: 0.9,
    settle: SETTLE,
    resize(next) {
      grid = next;
      // Samples close to square: two across a cell, and as many down as its height asks.
      sx = 2;
      sy = clamp(Math.round(2 * grid.aspect), 2, 6);
      width = grid.cols * sx;
      height = grid.rows * sy;
      depth = new Float32Array(width * height);
      light = new Float32Array(width * height);
      winner = new Int32Array(width * height);
      bary0 = new Float32Array(width * height);
      bary1 = new Float32Array(width * height);
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      speed = approach(speed, spin, 0.9, dt);
      turn += speed * dt;
      roll += speed * 0.42 * dt;
      // Lean toward the pointer, and settle back when it leaves.
      let tx = 0;
      let ty = 0;
      if (pointer.active && grid.cols) {
        tx = clamp((pointer.x - grid.cols / 2) / (grid.cols / 2), -1, 1) * 0.55;
        ty = clamp((pointer.y - grid.rows / 2) / (grid.rows / 2), -1, 1) * 0.4;
      }
      leanX = approach(leanX, tx, 2.4, dt);
      leanY = approach(leanY, ty, 2.4, dt);
    },
    press(x) {
      // A flick: the side you click sets which way it spins.
      const side = x < grid.cols / 2 ? -1 : 1;
      speed += side * Math.max(2.5, spin * 4);
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      if (cols < 4 || rows < 2) return;
      project();
      rasterise();
      shade();
      const per = sx * sy;
      const tick = Math.floor(time * 18);
      const cx = cols / 2;
      const cy = rows / 2;
      const reach = Math.hypot(cx, cy * grid.aspect);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let hits = 0;
          let sum = 0;
          let near = Infinity;
          let far = -Infinity;
          for (let j = 0; j < sy; j++) {
            let s = (row * sy + j) * width + col * sx;
            for (let i = 0; i < sx; i++, s++) {
              const z = depth[s]!;
              if (z !== Infinity) {
                hits++;
                sum += light[s]!;
                if (z < near) near = z;
                if (z > far) far = z;
              }
            }
          }
          if (!hits) continue;
          const cover = hits / per;
          // Where one part passes in front of another, a dark seam keeps them apart.
          const seam = far - near > 0.3;
          const lum = (sum / hits) * (seam ? 0.4 : 1);
          const tone = FIRST + clamp(Math.round((lum / 1.3) * (SHADES - 1)), 0, SHADES - 1);

          // It scrambles in from the middle outward.
          const jitter = hash3(col, row, 3);
          const dy = (row - cy) * grid.aspect;
          const d = Math.sqrt((col - cx) * (col - cx) + dy * dy) / reach;
          const at = 0.1 + d * 0.7 + jitter * 0.2;
          if (time < at) continue;
          if (time < at + 0.28) {
            surface.put(col, row, scrambled(col, row, tick), tone, 0.5 + 0.5 * cover);
            continue;
          }

          if (mode === 'glyphs') {
            surface.put(col, row, ramp(DONUT, clamp(lum, 0, 1)), tone, 0.35 + 0.65 * cover);
            continue;
          }
          if (cover < 0.5) {
            // The soft edge of the silhouette: a light glyph, no block.
            surface.put(col, row, ramp(EDGE, cover * 2), tone, 0.45 + 0.55 * cover);
            continue;
          }
          surface.fill(col, row, tone, 1);
          if (lum < 0.78) {
            surface.put(col, row, ramp(CUTS, (0.78 - lum) / 0.78), DEEP, 0.3 + 0.35 * lum);
          }
        }
      }
    },
  };
}
