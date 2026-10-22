import { approach, clamp, noise3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface MurmurationOptions {
  /** Birds per thousand cells. Default 90. */
  density?: number;
}

// One bird reads as a speck; where they bunch the sky darkens.
const CROWD = ':+*#@';
const INK = 0;

/**
 * Starlings at dusk. Each bird keeps its distance, matches its neighbours and drifts toward them,
 * while a slow wandering roost pulls the flock through folds and pours. The pointer is a falcon:
 * birds near it turn away, and the swerve ripples through the flock. A click scatters them.
 */
export function createMurmuration(options: MurmurationOptions = {}): AsciiScene {
  const density = options.density ?? 90;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  // Positions in cell widths on both axes, so distances are true.
  let x = new Float32Array(0);
  let y = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let fear = new Float32Array(0);
  let count = 0;
  let width = 0;
  let height = 0;
  let time = 0;
  let crowd = new Uint8Array(0);

  // Neighbour lookup: a grid of buckets one sight radius wide.
  const SIGHT = 4.5;
  const SPACE = 1.7;
  let bucketCols = 0;
  let bucketRows = 0;
  let head = new Int32Array(0);
  let link = new Int32Array(0);
  let scatterAt = { x: 0, y: 0, power: 0 };

  function populate() {
    width = grid.cols;
    height = grid.rows * grid.aspect;
    count = Math.round(((grid.cols * grid.rows) / 1000) * density);
    x = new Float32Array(count);
    y = new Float32Array(count);
    vx = new Float32Array(count);
    vy = new Float32Array(count);
    fear = new Float32Array(count);
    link = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * Math.min(width, height) * 0.2;
      x[i] = width / 2 + Math.cos(a) * r * 1.8;
      y[i] = height / 2 + Math.sin(a) * r;
      vx[i] = 10 + Math.random() * 4;
      vy[i] = (Math.random() - 0.5) * 4;
    }
    bucketCols = Math.max(1, Math.ceil(width / SIGHT));
    bucketRows = Math.max(1, Math.ceil(height / SIGHT));
    head = new Int32Array(bucketCols * bucketRows);
    crowd = new Uint8Array(grid.cols * grid.rows);
  }

  function rebucket() {
    head.fill(-1);
    for (let i = 0; i < count; i++) {
      const bc = clamp(Math.floor(x[i]! / SIGHT), 0, bucketCols - 1);
      const br = clamp(Math.floor(y[i]! / SIGHT), 0, bucketRows - 1);
      const b = br * bucketCols + bc;
      link[i] = head[b]!;
      head[b] = i;
    }
  }

  return {
    palette: ['ink'],
    settle: 4,
    resize(next) {
      const changed = next.cols !== grid.cols || next.rows !== grid.rows;
      grid = next;
      if (changed) populate();
    },
    step(dt, pointer: AsciiPointer) {
      if (!count) return;
      time += dt;
      rebucket();
      scatterAt.power = approach(scatterAt.power, 0, 3, dt);

      // The roost: a point that wanders a smooth path, so the flock never settles.
      const rx = width * (0.5 + 0.27 * clamp((noise3(time * 0.07, 0, 3) - 0.5) * 3, -1, 1));
      const ry = height * (0.47 + 0.18 * clamp((noise3(0, time * 0.09, 7) - 0.5) * 3, -1, 1));
      const hx = pointer.x;
      const hy = pointer.y * grid.aspect;

      for (let i = 0; i < count; i++) {
        const px = x[i]!;
        const py = y[i]!;
        let sepX = 0;
        let sepY = 0;
        let aliX = 0;
        let aliY = 0;
        let cohX = 0;
        let cohY = 0;
        let seen = 0;
        let alarm = 0;
        const bc = clamp(Math.floor(px / SIGHT), 0, bucketCols - 1);
        const br = clamp(Math.floor(py / SIGHT), 0, bucketRows - 1);
        for (let r = Math.max(0, br - 1); r <= Math.min(bucketRows - 1, br + 1); r++) {
          for (let c = Math.max(0, bc - 1); c <= Math.min(bucketCols - 1, bc + 1); c++) {
            for (let j = head[r * bucketCols + c]!; j !== -1; j = link[j]!) {
              if (j === i) continue;
              const dx = x[j]! - px;
              const dy = y[j]! - py;
              const d2 = dx * dx + dy * dy;
              if (d2 > SIGHT * SIGHT) continue;
              seen++;
              aliX += vx[j]!;
              aliY += vy[j]!;
              cohX += dx;
              cohY += dy;
              alarm = Math.max(alarm, fear[j]!);
              if (d2 < SPACE * SPACE && d2 > 1e-6) {
                const push = (SPACE * SPACE - d2) / d2;
                sepX -= dx * push;
                sepY -= dy * push;
              }
            }
          }
        }

        let ax = sepX * 14;
        let ay = sepY * 14;
        if (seen) {
          ax += (aliX / seen - vx[i]!) * 1.8 + (cohX / seen) * 0.5;
          ay += (aliY / seen - vy[i]!) * 1.8 + (cohY / seen) * 0.5;
        }
        // Drawn toward the roost, gently, so shape comes from the birds and not the path.
        // A spring, so the flock swings past the roost in long arcs and folds back on itself.
        ax += (rx - px) * 0.45;
        ay += (ry - py) * 0.65;
        // The edges of the sky turn birds back before they leave it.
        const m = 8;
        if (px < m) ax += (m - px) * 10;
        else if (px > width - m) ax -= (px - width + m) * 10;
        if (py < m) ay += (m - py) * 10;
        else if (py > height - m) ay -= (py - height + m) * 10;

        // Fear spreads through the flock a little weaker at each bird.
        let afraid = alarm * 0.92;
        if (pointer.active) {
          const dx = px - hx;
          const dy = py - hy;
          const d = Math.hypot(dx, dy);
          if (d < 9 && d > 1e-3) {
            const f = 1 - d / 9;
            afraid = Math.max(afraid, f);
            ax += (dx / d) * f * 160;
            ay += (dy / d) * f * 160;
          }
        }
        if (scatterAt.power > 0.02) {
          const dx = px - scatterAt.x;
          const dy = py - scatterAt.y;
          const d = Math.hypot(dx, dy) + 0.5;
          if (d < 22) {
            ax += (dx / d) * scatterAt.power * 260 * (1 - d / 22);
            ay += (dy / d) * scatterAt.power * 260 * (1 - d / 22);
          }
        }
        fear[i] = approach(fear[i]!, afraid, 8, dt);

        let nvx = vx[i]! + ax * dt;
        let nvy = vy[i]! + ay * dt;
        // Frightened birds fly faster; everyone keeps a cruising speed.
        const speed = Math.hypot(nvx, nvy) || 1;
        const cruise = 12 + fear[i]! * 10;
        const s = clamp(speed, cruise * 0.6, cruise * 1.4) / speed;
        nvx *= s;
        nvy *= s;
        vx[i] = nvx;
        vy[i] = nvy;
        x[i] = px + nvx * dt;
        y[i] = py + nvy * dt;
      }
    },
    press(px, py) {
      scatterAt = { x: px, y: py * grid.aspect, power: 1 };
    },
    draw(surface: GlyphSurface) {
      crowd.fill(0);
      const { cols, rows, aspect } = grid;
      for (let i = 0; i < count; i++) {
        const col = Math.floor(x[i]!);
        const row = Math.floor(y[i]! / aspect);
        if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const k = row * cols + col;
        if (crowd[k]! < 255) crowd[k] = crowd[k]! + 1;
      }
      for (let k = 0; k < crowd.length; k++) {
        const n = crowd[k]!;
        if (!n) continue;
        const col = k % cols;
        const row = (k - col) / cols;
        const glyph = n === 1 ? DOT : CROWD[Math.min(CROWD.length - 1, n - 2)]!;
        surface.put(col, row, glyph, INK, Math.min(1, 0.45 + n * 0.14));
      }
    },
  };
}
