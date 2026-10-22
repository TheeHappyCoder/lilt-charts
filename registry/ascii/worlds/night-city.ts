import { approach, clamp, hash3 } from '../engine/noise';
import { DOT, type GlyphSurface } from '../engine/surface';
import type { AsciiGrid, AsciiPointer, AsciiScene } from '../engine/types';

export interface NightCityOptions {
  /** Colour of a lit window. Default a warm lamp yellow. */
  windows?: string;
  /** Share of windows lit once the city is awake, 0 to 1. Default 0.42. */
  lights?: number;
  /** Cars on the street at once. Default 8. */
  traffic?: number;
  /** Draw the moon. Default true. */
  moon?: boolean;
}

const INK = 0;
const LAMP = 1;
const SCREEN = 2;
const BEACON = 3;
const HEAD = 4;
const TAIL = 5;
const BODY = 6;

interface Tower {
  x: number;
  width: number;
  height: number;
  /** 0 far, 1 near. */
  layer: number;
  seed: number;
  /** A blinking light on the roof. */
  mast: boolean;
}

interface Car {
  x: number;
  lane: number;
  speed: number;
}

/**
 * A city at night. The skyline stands in two rows, the far one fainter; at dusk its windows come
 * on one by one, and after that people come home, switch off, and leave a television flickering.
 * Masts blink red, cars stream along the street with white lights coming and red going, and a
 * moon hangs over it all. The pointer is a lit window's worth of attention: offices near it stay
 * on. A click switches a whole tower on or off, floor by floor.
 */
export function createNightCity(options: NightCityOptions = {}): AsciiScene {
  const lit = clamp(options.lights ?? 0.42, 0, 1);
  const trafficCount = clamp(Math.round(options.traffic ?? 8), 0, 40);
  const moon = options.moon ?? true;
  let grid: AsciiGrid = { cols: 0, rows: 0, aspect: 2 };
  let towers: Tower[] = [];
  const cars: Car[] = [];
  let time = 0;
  let px = -999;
  let py = -999;
  let near = 0;
  /** Towers switched by a click: their index, when, and which way. */
  const switches = new Map<number, { at: number; on: boolean }>();

  const street = () => grid.rows - 2;

  function build() {
    towers = [];
    for (const layer of [0, 1]) {
      let x = -2;
      while (x < grid.cols + 2) {
        const seed = towers.length * 7.3 + layer * 101;
        const width = 5 + Math.floor(hash3(seed, 1, 0) * (layer ? 9 : 7));
        const tallest = street() * (layer ? 0.7 : 0.82);
        const height = Math.max(4, Math.floor(tallest * (0.25 + hash3(seed, 2, 0) * 0.75)));
        towers.push({
          x,
          width,
          height,
          layer,
          seed,
          mast: hash3(seed, 3, 0) > 0.7 && height > tallest * 0.6,
        });
        x += width + (layer ? 1 + Math.floor(hash3(seed, 4, 0) * 3) : 0);
      }
    }
    cars.length = 0;
    for (let i = 0; i < trafficCount; i++) cars.push(makeCar(true));
  }

  function makeCar(spread: boolean): Car {
    const lane = Math.random() < 0.5 ? 0 : 1;
    const speed = (lane ? -1 : 1) * (8 + Math.random() * 10);
    const x = spread ? Math.random() * grid.cols : speed > 0 ? -6 : grid.cols + 6;
    return { x, lane, speed };
  }

  /** Whether a window is lit now, from its own schedule, the dusk, clicks and the pointer. */
  function windowOn(t: Tower, index: number, col: number, floor: number): 0 | 1 | 2 {
    const key = t.seed * 13 + col * 31 + floor * 7;
    // Dusk: each window has its moment in the first few seconds.
    const dusk = hash3(key, 5, 1) * 5;
    if (time < dusk) return 0;
    const flip = switches.get(index);
    if (flip) {
      const reached = (time - flip.at) * 14 > floor + hash3(key, 6, 1) * 3;
      if (reached) return flip.on ? 1 : 0;
    }
    if (near > 0.1) {
      const dx = col - px;
      const dy = (street() - floor * 2 - py) * grid.aspect;
      if (dx * dx + dy * dy < 36 * near) return 1;
    }
    // Each window changes now and then, on its own slow clock.
    const period = 9 + hash3(key, 7, 1) * 14;
    const epoch = Math.floor((time + hash3(key, 8, 1) * period) / period);
    const roll = hash3(key, epoch, 2);
    if (roll < lit) return 1;
    if (roll < lit + 0.025) return 2;
    return 0;
  }

  return {
    palette: [
      'ink',
      options.windows ?? '#ffcf6e',
      '#8fb4ff',
      '#ff4d4d',
      '#fff6d8',
      '#ff5a3c',
      'ink',
    ],
    settle: 6,
    lineHeight: 1.1,
    resize(next) {
      grid = next;
      switches.clear();
      build();
    },
    step(dt, pointer: AsciiPointer) {
      time += dt;
      near = approach(near, pointer.active ? 1 : 0, 3, dt);
      if (pointer.active) {
        px = pointer.x;
        py = pointer.y;
      }
      for (let i = 0; i < cars.length; i++) {
        const car = cars[i]!;
        car.x += car.speed * dt;
        if (car.x < -8 || car.x > grid.cols + 8) cars[i] = makeCar(false);
      }
    },
    press(x) {
      // The nearest tower in front at that column switches the other way.
      let index = -1;
      towers.forEach((t, i) => {
        if (x >= t.x && x < t.x + t.width && (index < 0 || t.layer >= towers[index]!.layer))
          index = i;
      });
      if (index < 0) return;
      const was = switches.get(index);
      switches.set(index, { at: time, on: was ? !was.on : true });
    },
    draw(surface: GlyphSurface) {
      const { cols, rows } = grid;
      const ground = street();

      // Stars over the city, and the moon.
      for (let row = 0; row < ground * 0.6; row++) {
        for (let col = 0; col < cols; col++) {
          const s = hash3(col, row, 11);
          if (s > 0.988)
            surface.put(
              col,
              row,
              DOT,
              INK,
              0.15 + 0.25 * (0.5 + 0.5 * Math.sin(time * 1.5 + s * 200)),
            );
        }
      }
      if (moon) {
        const mx = cols * 0.78;
        const my = Math.max(3, rows * 0.16);
        const r = Math.max(3, Math.min(cols, rows * grid.aspect) * 0.08);
        for (
          let row = Math.floor(my - r / grid.aspect - 1);
          row <= my + r / grid.aspect + 1;
          row++
        ) {
          for (let col = Math.floor(mx - r * 1.6); col <= mx + r * 1.6; col++) {
            const dx = col + 0.5 - mx;
            const dy = (row + 0.5 - my) * grid.aspect;
            const d = Math.hypot(dx, dy) / r;
            if (d > 1.5) continue;
            if (d > 1) {
              // A faint halo around it.
              if (hash3(col, row, 31) > 0.5) surface.put(col, row, DOT, LAMP, (1.5 - d) * 0.35);
              continue;
            }
            // A full moon, its seas a little darker than its highlands.
            const sea = hash3(Math.floor(col / 2), Math.floor(row / 1), 9) > 0.72 && d < 0.8;
            surface.put(col, row, sea ? '%' : d > 0.88 ? 'o' : '@', LAMP, sea ? 0.55 : 0.9);
          }
        }
      }

      // Towers back to front: a solid faint body, then lit windows cut into it.
      const order = towers.map((t, i) => [t, i] as const).sort((a, b) => a[0].layer - b[0].layer);
      for (const [t, index] of order) {
        const top = ground - t.height;
        const body = t.layer ? 0.1 : 0.05;
        for (let row = top; row < ground; row++) {
          for (let col = t.x; col < t.x + t.width; col++) {
            // A nearer tower hides the windows of the one behind it.
            surface.put(col, row, ' ', INK, 1);
            surface.fill(col, row, BODY, body);
          }
        }
        // Windows every other column and row, leaving a margin.
        for (let row = top + 1, floor = 0; row < ground - 1; row += 2, floor++) {
          for (let col = t.x + 1; col < t.x + t.width - 1; col += 2) {
            const on = windowOn(t, index, col, floor);
            if (on === 1) surface.put(col, row, t.layer ? '#' : '+', LAMP, t.layer ? 0.9 : 0.45);
            else if (on === 2) {
              const flicker = 0.4 + 0.5 * Math.abs(Math.sin(time * 7 + col * 3 + floor));
              surface.put(col, row, '#', SCREEN, flicker * (t.layer ? 1 : 0.5));
            } else surface.put(col, row, DOT, INK, t.layer ? 0.12 : 0.06);
          }
        }
        if (t.mast) {
          const mx = t.x + Math.floor(t.width / 2);
          surface.put(mx, top - 1, '|', INK, 0.5);
          surface.put(mx, top - 2, '|', INK, 0.5);
          const blink = Math.sin(time * 3 + t.seed) > 0.6;
          if (blink) surface.put(mx, top - 3, '*', BEACON, 1);
        }
      }

      // The street: a kerb, lane dashes, and the cars.
      for (let col = 0; col < cols; col++) {
        surface.put(col, ground, '_', INK, 0.35);
        if ((col + Math.floor(time * 2)) % 6 < 2) surface.put(col, ground + 1, '-', INK, 0.12);
      }
      for (const car of cars) {
        const row = ground + car.lane;
        const dir = Math.sign(car.speed);
        for (let k = 0; k < 4; k++) surface.put(car.x - dir * k, row, '=', INK, 0.55);
        surface.put(car.x + dir, row, DOT, HEAD, 1);
        surface.put(car.x - dir * 4, row, DOT, TAIL, 0.9);
        // Headlight glow spills ahead.
        surface.put(car.x + dir * 2, row, '-', HEAD, 0.3);
      }
    },
  };
}
