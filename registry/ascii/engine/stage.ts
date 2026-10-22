import { GlyphSurface, LEVELS } from './surface';
import type { AsciiPointer, AsciiScene } from './types';

const STEP = 1 / 60;
const MAX_STEPS = 8;
const FALLBACK_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export interface AsciiStageOptions {
  /** Font size of each cell in CSS pixels. Smaller cells give finer pictures. Default 14. */
  cellSize?: number;
  /** Follow the pointer and answer clicks. Default true. */
  interactive?: boolean;
  /** How fast the scene's clock runs: 0.5 is half speed, 2 is double. Default 1. */
  speed?: number;
}

/**
 * Runs a scene on a canvas: a fixed-step clock, resizing, pointer input, pausing while off screen
 * or in a hidden tab, a single still frame for reduced motion, and repainting when the font or the
 * page theme changes. The canvas's CSS `font-family` and `color` set the type and the ink.
 */
export class AsciiStage {
  private ctx: CanvasRenderingContext2D;
  private surface = new GlyphSurface();
  private styles: string[] = [];
  private pointer: AsciiPointer = { x: 0, y: 0, active: false };
  private cellSize: number;
  private interactive: boolean;
  private speed: number;
  private font = '';
  private cw = 8;
  /** Whether every glyph advances one cell, so rows can be painted as strings. */
  private mono = true;
  private ch = 18;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private onScreen = true;
  private disposed = false;
  private reducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  /** The grid the scene was last sized to. */
  private grid = '';
  private intersectionObserver: IntersectionObserver;
  private themeObserver: MutationObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private scene: AsciiScene,
    options: AsciiStageOptions = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('AsciiStage needs a 2D canvas context.');
    this.ctx = ctx;
    this.cellSize = options.cellSize ?? 14;
    this.interactive = options.interactive ?? true;
    this.speed = options.speed ?? 1;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.onScreen = entry?.isIntersecting ?? true;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);
    // Theme switches usually flip a class or attribute on the root; the ink follows.
    this.themeObserver = new MutationObserver(() => this.restyle());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });

    this.reducedMotion.addEventListener('change', this.schedule);
    document.addEventListener('visibilitychange', this.schedule);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('blur', this.onPointerLeave);

    this.resize();
    // Canvas text never asks for a webfont, so measure again once the page's fonts arrive.
    document.fonts?.ready.then(() => {
      if (this.disposed) return;
      this.resize();
    });
    this.schedule();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.themeObserver.disconnect();
    this.reducedMotion.removeEventListener('change', this.schedule);
    document.removeEventListener('visibilitychange', this.schedule);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('blur', this.onPointerLeave);
  }

  /** Changes the stage's options in place, keeping the scene's world as it is. */
  configure(options: AsciiStageOptions) {
    this.speed = options.speed ?? this.speed;
    if (options.interactive !== undefined) {
      this.interactive = options.interactive;
      if (!this.interactive) this.pointer.active = false;
    }
    if (options.cellSize !== undefined && options.cellSize !== this.cellSize) {
      this.cellSize = options.cellSize;
      this.resize();
    }
  }

  /** Reads the canvas's `color` again, after the ink was changed by something other than a theme. */
  refresh() {
    this.restyle();
  }

  private get still() {
    return this.reducedMotion.matches;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);

    const family = getComputedStyle(this.canvas).fontFamily || FALLBACK_FONT;
    this.font = `500 ${this.cellSize}px ${family}, ${FALLBACK_FONT}`;
    const { ctx } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = this.font;
    this.cw = Math.max(4, ctx.measureText('M').width);
    this.mono = Math.abs(ctx.measureText('i').width - this.cw) < 0.01;
    this.ch = Math.round(this.cellSize * (this.scene.lineHeight ?? 1.25));

    const cols = Math.ceil(rect.width / this.cw);
    const rows = Math.ceil(rect.height / this.ch);
    this.surface.resize(cols, rows);
    // Fonts arriving or a pixel of layout can measure the same grid again; the scene keeps its world.
    const grid = `${cols}x${rows}x${this.ch / this.cw}`;
    if (grid !== this.grid) {
      this.grid = grid;
      this.scene.resize({ cols, rows, aspect: this.ch / this.cw });
    }
    this.restyle();
  }

  /** Resolves the palette to fill styles, one per colour and opacity step. */
  private restyle() {
    const { ctx } = this;
    const ink = getComputedStyle(this.canvas).color;
    this.styles = this.scene.palette.flatMap((colour) => {
      ctx.fillStyle = '#000';
      ctx.fillStyle = colour === 'ink' ? ink : colour;
      const [r, g, b] = parseColour(String(ctx.fillStyle));
      return Array.from({ length: LEVELS }, (_, i) => `rgba(${r},${g},${b},${(i + 1) / LEVELS})`);
    });
    if (this.still) this.drawStill();
  }

  private schedule = () => {
    cancelAnimationFrame(this.raf);
    if (this.disposed) return;
    if (this.still) {
      this.drawStill();
      return;
    }
    if (!this.onScreen || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000) * this.speed;
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.scene.step(STEP, this.pointer);
      this.time += STEP;
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.paint();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Lets the scene settle without the pointer, then shows that one frame. */
  private drawStill() {
    const settle = this.scene.settle ?? 3;
    const idle: AsciiPointer = { x: 0, y: 0, active: false };
    while (this.time < settle) {
      this.scene.step(STEP, idle);
      this.time += STEP;
    }
    this.paint();
  }

  private paint() {
    const { ctx, canvas, surface } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.font = this.font;
    ctx.textBaseline = 'middle';
    surface.clear();
    this.scene.draw(surface);
    surface.paint(ctx, this.styles, this.cw, this.ch, this.mono);
  }

  private toCells(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    return { x: x / this.cw, y: y / this.ch, inside };
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.interactive) return;
    const { x, y, inside } = this.toCells(e);
    this.pointer.x = x;
    this.pointer.y = y;
    // A finger has no hover; it only presses.
    this.pointer.active = inside && e.pointerType !== 'touch';
  };

  private onPointerDown = (e: PointerEvent) => {
    const { x, y, inside } = this.toCells(e);
    if (!inside || this.still || !this.interactive) return;
    this.scene.press?.(x, y);
  };

  private onPointerLeave = () => {
    this.pointer.active = false;
  };
}

/** Reads the `#rrggbb` or `rgba(r, g, b, a)` a canvas reports back for any CSS colour. */
function parseColour(value: string): [number, number, number] {
  if (value.startsWith('#')) {
    const n = parseInt(value.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}
