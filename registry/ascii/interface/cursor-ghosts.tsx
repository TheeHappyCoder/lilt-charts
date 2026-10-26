'use client';

import { useEffect, useRef } from 'react';
import {
  createGhost,
  ghostReading,
  seededRandom,
  stepGhost,
  type Ghost,
  type GhostFire,
  type GhostRect,
  type GhostTone,
  type GhostWorld,
} from './ghost-walk';
import { fitCanvas, MONO_STACK, useReducedMotion } from './motion';

export interface CursorGhostsProps {
  /** How many ghosts share the area at once. Default 3. */
  count?: number;
  /**
   * What counts as a fire: elements inside the area matching this selector. Ghosts that get cold
   * hurry to the nearest one. Default `[data-lilt-fire]`, the same marks `CursorWarmth` warms at.
   */
  fires?: string;
  /** Elements inside the area that wandering ghosts keep clear of, such as a headline. */
  avoid?: string;
  /** Roughly how many seconds a warm ghost takes to freeze; each one differs a little. Default 18. */
  chill?: number;
  /** Show a small reading beside a ghost when it shivers, rushes or warms up. Default true. */
  readings?: boolean;
  /** Colour of the frost and of a cold reading. Default an icy blue. */
  frost?: string;
  /** Colour of the embers and of a warm reading. Default amber. */
  ember?: string;
  /** Seed for the ghosts' wandering, to replay the same walk. Default a new one each visit. */
  seed?: number;
}

/** The arrow, as `CursorWarmth` draws a burnt one, with its tip at (4, 3) in a 24 box. */
const ARROW = 'M3.5 2.5v16.2l4.3-4 2.9 6.1 2.6-1.2-2.8-6h6.1z';
const SCALE = 0.95;
const HOT = '#ff5a36';
/** Seconds between ghosts: one leaves, and a little later someone else wanders in. */
const ARRIVAL_GAP = [2, 7] as const;

interface Puff {
  x: number;
  y: number;
  age: number;
}

interface Slot {
  ghost: Ghost | null;
  /** Seconds until the next ghost arrives in an empty slot. */
  wait: number;
  breathOwed: number;
  shakeAt: number;
  shakeX: number;
  shakeY: number;
  /** How much of the reading shows, 0 to 1, so it fades rather than blinks. */
  say: number;
  said: { text: string; tone: GhostTone } | null;
}

/**
 * Other visitors' pointers, imagined: a few ghost cursors that wander an area such as a hero,
 * pausing as if reading. Away from a fire they slowly get cold; once one is freezing it shivers,
 * says so, and hurries to the nearest fire (any element inside marked `data-lilt-fire`), where it
 * circles until it is cosy again. Now and then one finds it too hot and darts off. After a while
 * each one wanders out and someone new arrives. It fills its positioned parent on one canvas that
 * never takes the pointer, rests while the area is out of view or the tab is hidden, and shows
 * nothing with reduced motion. Pair it with `CursorWarmth` so the reader's own pointer feels the
 * cold too.
 */
export function CursorGhosts({
  count = 3,
  fires = '[data-lilt-fire]',
  avoid,
  chill = 18,
  readings = true,
  frost = '#a9d8ff',
  ember = '#ffb22e',
  seed,
}: CursorGhostsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const settings = useRef({ fires, avoid, chill, readings, frost, ember });
  settings.current = { fires, avoid, chill, readings, frost, ember };

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !area || !ctx) return;
    if (reduced) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const rand = seededRandom(seed ?? Math.floor(Math.random() * 2 ** 31));
    const arrow = typeof Path2D === 'function' ? new Path2D(ARROW) : null;
    const world: GhostWorld = { width: 1, height: 1, fires: [], avoid: [] };
    let worldAt = -Infinity;
    let dpr = 1;
    let ink = '#e8e6f2';
    let raf = 0;
    let last = -1;
    let time = 0;
    let visible = false;
    const puffs: Puff[] = [];
    const slots: Slot[] = Array.from({ length: Math.max(0, Math.round(count)) }, () => ({
      ghost: null,
      wait: 0,
      breathOwed: 0,
      shakeAt: 0,
      shakeX: 0,
      shakeY: 0,
      say: 0,
      said: null,
    }));

    const measure = () => {
      const box = area.getBoundingClientRect();
      const local = (element: Element): GhostRect => {
        const r = element.getBoundingClientRect();
        return {
          left: r.left - box.left,
          top: r.top - box.top,
          right: r.right - box.left,
          bottom: r.bottom - box.top,
        };
      };
      world.width = Math.max(1, box.width);
      world.height = Math.max(1, box.height);
      const s = settings.current;
      world.fires = [...area.querySelectorAll(s.fires)].flatMap((element): GhostFire[] => {
        const r = local(element);
        const w = r.right - r.left;
        const h = r.bottom - r.top;
        if (!w) return [];
        return [{ x: r.left + w / 2, y: r.top + h / 2, reach: Math.max(w, h) * 1.2 }];
      });
      world.avoid = s.avoid ? [...area.querySelectorAll(s.avoid)].map(local) : [];
      ink = getComputedStyle(canvas).color || ink;
      dpr = fitCanvas(canvas, world.width, world.height);
      worldAt = time;
    };

    const arrive = (slot: Slot, inside: boolean, temp?: number) => {
      const ghost = createGhost(world, rand, { inside, temp });
      // Each ghost feels the cold a little differently around the chosen pace.
      ghost.chill = settings.current.chill * (0.7 + rand() * 0.6);
      slot.ghost = ghost;
    };

    measure();
    // The page opens with company: one ghost already cold, so the rush to the fire comes soon,
    // and the rest already about or on their way in.
    slots.forEach((slot, k) => {
      if (k === 0) arrive(slot, true, 0.2);
      else if (k % 2) arrive(slot, true);
      else slot.wait = k * 1.5;
    });

    const draw = () => {
      const s = settings.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, world.width, world.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 11px ${MONO_STACK}`;
      for (const puff of puffs) {
        const t = puff.age / 1.4;
        ctx.globalAlpha = (1 - t) * 0.45;
        ctx.fillStyle = '#e6ecfb';
        ctx.fillText(t < 0.3 ? 'o' : t < 0.65 ? '°' : '.', puff.x, puff.y);
      }
      for (const slot of slots) {
        const ghost = slot.ghost;
        if (!ghost) continue;
        const x = ghost.x + slot.shakeX;
        const y = ghost.y + slot.shakeY;
        const fade = ghost.alpha;
        const cold = Math.min(1, Math.max(0, (0.5 - ghost.temp) / 0.5));
        // Frost closes in round a cold ghost, as round a cold pointer, a little smaller.
        const crystals = Math.round(cold * 6);
        const r = 19 - cold * 6;
        ctx.fillStyle = s.frost;
        for (let k = 0; k < crystals; k++) {
          const a = (k / 6) * Math.PI * 2 + time * 0.35;
          ctx.globalAlpha = (0.3 + cold * 0.5) * fade;
          ctx.fillText(k % 2 ? '+' : '*', x + 3 + Math.cos(a) * r, y + 5 + Math.sin(a) * r);
        }
        // Embers circle one warming by a fire.
        if (ghost.warmth > 0.05 && ghost.temp > 0.55) {
          const glow = Math.min(1, (ghost.temp - 0.55) / 0.45);
          ctx.fillStyle = ghost.scorched > 0 ? HOT : s.ember;
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 - time * (1 + ghost.warmth * 2);
            ctx.globalAlpha = glow * 0.75 * fade;
            ctx.fillText(k ? '.' : '*', x + 3 + Math.cos(a) * 14, y + 5 + Math.sin(a) * 14);
          }
        }
        if (arrow) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(SCALE, SCALE);
          ctx.translate(-4, -3);
          ctx.globalAlpha = 0.86 * fade;
          ctx.fillStyle = ink;
          ctx.fill(arrow);
          // A cold ghost takes on the frost's colour; a warm one by the fire, the ember's.
          const tint = Math.max(cold, ghost.warmth > 0.05 ? (ghost.temp - 0.6) / 0.4 : 0);
          if (tint > 0) {
            ctx.globalAlpha = Math.min(1, tint) * 0.65 * fade;
            ctx.fillStyle = cold > 0 ? s.frost : ghost.scorched > 0 ? HOT : s.ember;
            ctx.fill(arrow);
          }
          ctx.globalAlpha = 0.5 * fade;
          ctx.lineWidth = 1.1;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgb(10 10 16 / 0.7)';
          ctx.stroke(arrow);
          ctx.restore();
        }
        if (slot.say > 0.01 && slot.said) {
          // The reading, in a small pill of dark glass beside the arrow.
          const tone =
            slot.said.tone === 'hot' ? HOT : slot.said.tone === 'frost' ? s.frost : s.ember;
          ctx.font = `500 10px ${MONO_STACK}`;
          const w = ctx.measureText(slot.said.text).width + 20;
          const left = x + 14 + w < world.width - 4 ? x + 14 : x - 14 - w;
          const top = y + 12;
          ctx.globalAlpha = slot.say * fade;
          ctx.fillStyle = 'rgb(16 14 24 / 0.62)';
          ctx.beginPath();
          ctx.roundRect(left, top, w, 18, 9);
          ctx.fill();
          ctx.strokeStyle = 'rgb(255 255 255 / 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.arc(left + 8, top + 9, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.textAlign = 'left';
          ctx.fillText(slot.said.text, left + 13, top + 9.5);
          ctx.textAlign = 'center';
          ctx.font = `600 11px ${MONO_STACK}`;
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const dt = last < 0 ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;
      // Layout can shift under the area (fonts, a resize); look again every second.
      if (time - worldAt > 1) measure();
      for (const slot of slots) {
        const ghost = slot.ghost;
        if (!ghost) {
          slot.wait -= dt;
          if (slot.wait <= 0) arrive(slot, false);
          continue;
        }
        stepGhost(ghost, dt, world, rand);
        if (ghost.phase === 'gone') {
          slot.ghost = null;
          slot.wait = ARRIVAL_GAP[0] + rand() * (ARRIVAL_GAP[1] - ARRIVAL_GAP[0]);
          slot.say = 0;
          continue;
        }
        // A cold ghost's breath shows, faster the colder it is.
        if (ghost.temp < 0.4) {
          slot.breathOwed += dt / (0.8 + ghost.temp * 1.8);
          while (slot.breathOwed >= 1) {
            slot.breathOwed -= 1;
            if (puffs.length < 40) puffs.push({ x: ghost.x + 9, y: ghost.y - 6, age: 0 });
          }
        } else slot.breathOwed = 0;
        // A freezing ghost trembles, a small uneven shake a few times a second.
        const shiver = ghost.phase === 'shiver' ? 1 : Math.max(0, (0.15 - ghost.temp) / 0.15);
        if (shiver > 0 && time - slot.shakeAt > 0.035) {
          slot.shakeAt = time;
          const amp = 0.6 + shiver * 1.8;
          slot.shakeX = (rand() * 2 - 1) * amp;
          slot.shakeY = (rand() * 2 - 1) * amp * 0.6;
        } else if (shiver === 0) {
          slot.shakeX = 0;
          slot.shakeY = 0;
        }
        const reading = settings.current.readings ? ghostReading(ghost) : null;
        if (reading) slot.said = reading;
        slot.say = Math.min(1, Math.max(0, slot.say + dt * (reading ? 5 : -2.5)));
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const puff = puffs[i]!;
        puff.age += dt;
        puff.y -= dt * 16;
        puff.x += dt * 12;
        if (puff.age > 1.4) puffs.splice(i, 1);
      }
      draw();
      raf = requestAnimationFrame(frame);
    };

    // Runs only while the area is on screen and the tab is showing; time away is not counted.
    const update = () => {
      const run = visible && document.visibilityState === 'visible';
      if (run && !raf) {
        last = -1;
        measure();
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    seen.observe(area);
    const resized = new ResizeObserver(() => {
      measure();
      if (!raf) draw();
    });
    resized.observe(area);
    document.addEventListener('visibilitychange', update);

    return () => {
      cancelAnimationFrame(raf);
      seen.disconnect();
      resized.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [count, seed, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="lilt-cursor-ghosts"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
