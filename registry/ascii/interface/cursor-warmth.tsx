'use client';

import { useEffect, useRef } from 'react';
import { fitCanvas, MONO_STACK, useReducedMotion } from './motion';

export interface CursorWarmthProps {
  /**
   * Where it shows: a CSS selector for the area, such as a hero. Outside it the pointer keeps
   * cooling but nothing is drawn. Default the whole page.
   */
  scope?: string;
  /**
   * What counts as a fire: elements matching this selector. Each warms the pointer within about
   * its own size of its centre. Default `[data-lilt-fire]`.
   */
  fires?: string;
  /** Seconds a warm pointer takes to frost over away from any fire. Default 25. */
  chill?: number;
  /** Seconds a frozen pointer takes to thaw right by a fire. Default 3. */
  thaw?: number;
  /** Seconds a pointer held in the heart of a fire takes, once it is fully warm, to burn. Default 5. */
  scorch?: number;
  /** Colour of the frost and of a cold reading. Default an icy blue. */
  frost?: string;
  /** Colour of the embers and of a warm reading. Default amber. */
  ember?: string;
}

/** Where the temperature is kept for the tab, so a cold pointer stays cold from page to page. */
const STORE = 'lilt-cursor-warmth';
/** Set once the pointer has burnt; it stays burnt for the rest of the tab's session. */
const BURNT = 'lilt-cursor-burnt';

/** Readings run from −12° frozen to 24° fully warm, then on to 40° as it overheats and burns. */
const COLDEST = -12;
const WARMEST = 24;
const HOTTEST = 40;
/** How close to a fire's heart counts as in it, for overheating, as a share of its warmth. */
const HEART = 0.55;
const HOT = '#ff5a36';
const MILD = 'rgb(236 234 244 / 0.82)';

interface Puff {
  x: number;
  y: number;
  age: number;
  /** Smoke from a burning pointer is dark and wavy; breath is pale. */
  smoke: boolean;
}

/** A charred arrow with embers still glowing in its edges; the link version glows at the tip. */
function charred(tip: boolean) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3.5 2.5v16.2l4.3-4 2.9 6.1 2.6-1.2-2.8-6h6.1z" fill="#16110e" stroke="#5a4334" stroke-width="1.1" stroke-linejoin="round"/><path d="M5.2 7.4l1.6 2.2-.9 2.4M8.6 11.2l2.2.6" fill="none" stroke="#2b211b" stroke-width=".8" stroke-linecap="round"/><circle cx="12.6" cy="12.6" r=".9" fill="#ff7a1a"/><circle cx="4.4" cy="15.6" r=".7" fill="#ff9a2e"/><circle cx="11.4" cy="19.3" r=".6" fill="#ff5a1a"/>${tip ? '<circle cx="3.9" cy="3.2" r="1.6" fill="#ffb22e"/><circle cx="3.9" cy="3.2" r="2.8" fill="#ff7a1a" opacity=".35"/>' : ''}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 3`;
}

/**
 * Swaps the page's cursor for a charred one, for the rest of the session. Call it on pages without
 * `CursorWarmth` to keep a burnt pointer burnt across full reloads; it does nothing if it never
 * burnt. Text fields keep their text cursor.
 */
export function restoreBurntCursor() {
  try {
    if (sessionStorage.getItem(BURNT) === null) return;
  } catch {
    return;
  }
  burnCursor();
}

function burnCursor() {
  const root = document.documentElement;
  root.dataset.liltBurnt = '';
  if (document.getElementById('lilt-burnt-cursor')) return;
  const style = document.createElement('style');
  style.id = 'lilt-burnt-cursor';
  style.textContent = `html[data-lilt-burnt], html[data-lilt-burnt] body { cursor: ${charred(false)}, auto; }
html[data-lilt-burnt] :is(a[href], button:not(:disabled), [role='button'], [role='tab'], [role='radio'], [role='option'], [role='menuitem'], label, summary, select) { cursor: ${charred(true)}, pointer; }`;
  document.head.append(style);
}

/** What the reading says, in a word, for how warm the pointer is and how near a fire. */
function moodOf(temp: number, heat: number, warm: number) {
  if (heat > 0.7) return 'burning!';
  if (heat > 0.35) return 'too hot!';
  if (heat > 0) return 'toasty';
  if (temp < 0.15) return 'freezing';
  if (temp < 0.4) return 'brr';
  if (warm > 0.15) return temp > 0.75 ? 'cosy' : 'warming up';
  if (temp < 0.55) return 'chilly';
  return temp > 0.85 ? 'warm' : 'mild';
}

/**
 * The pointer has a temperature, and a small reading beside it always says how it is doing, such
 * as `brr −6°` or `cosy 21°`, in a pill of dark glass. Away from any fire it slowly cools: frost
 * crystals close in round it, its breath shows, and once it is freezing it shivers. Near a fire
 * (any element marked `data-lilt-fire`) it thaws in a few seconds and embers circle it. Hold it in
 * the heart of the fire past 24° and it overheats, warns you, smokes, and at 40° it burns: the
 * cursor turns to charcoal for the rest of the session. It draws on one fixed canvas above the
 * page that never takes the pointer, sleeps when there is nothing to draw, and skips touch; with
 * reduced motion it keeps the reading and the burn, without the frost, embers or shivering.
 */
export function CursorWarmth({
  scope,
  fires = '[data-lilt-fire]',
  chill = 25,
  thaw = 3,
  scorch = 5,
  frost = '#a9d8ff',
  ember = '#ffb22e',
}: CursorWarmthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const settings = useRef({ scope, fires, chill, thaw, scorch, frost, ember, reduced });
  settings.current = { scope, fires, chill, thaw, scorch, frost, ember, reduced };

  useEffect(() => {
    const canvas = canvasRef.current;
    const pill = pillRef.current;
    const ctx = canvas?.getContext('2d');
    const dot = pill?.firstElementChild as HTMLElement | null;
    const label = pill?.lastElementChild as HTMLElement | null;
    if (!canvas || !ctx || !pill || !dot || !label) return;
    let shown = '';
    let pillWidth = 0;
    let temp = 0.7;
    // How far past fully warm it has overheated, from 0 to 1, where it burns.
    let heat = 0;
    let burnt = false;
    // Seconds left of the moment it burns, when the reading says so.
    let burning = 0;
    try {
      const saved = Number(sessionStorage.getItem(STORE));
      if (saved >= 0 && saved <= 1 && sessionStorage.getItem(STORE) !== null) temp = saved;
      burnt = sessionStorage.getItem(BURNT) !== null;
    } catch {
      // Storage can be unavailable; the pointer starts warm and unburnt.
    }
    if (burnt) burnCursor();
    let x = 0;
    let y = 0;
    let inside = false;
    let raf = 0;
    // Unset until the pointer first comes in: time before that is not time in the cold.
    let last = -1;
    let time = 0;
    let breathOwed = 0;
    let smokeOwed = 0;
    let shakeAt = 0;
    let shakeX = 0;
    let shakeY = 0;
    let dpr = 1;
    const puffs: Puff[] = [];
    let sources: Element[] = [];
    let sourcesAt = -1;

    const resize = () => {
      dpr = fitCanvas(canvas, window.innerWidth, window.innerHeight);
    };
    resize();

    const warmthAt = () => {
      if (time - sourcesAt > 0.5) {
        sources = [...document.querySelectorAll(settings.current.fires)];
        sourcesAt = time;
      }
      let most = 0;
      for (const fire of sources) {
        const box = fire.getBoundingClientRect();
        if (!box.width) continue;
        const reach = Math.max(box.width, box.height) * 1.2;
        const d = Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2));
        most = Math.max(most, Math.max(0, 1 - d / reach) ** 1.3);
      }
      return most;
    };

    const save = () => {
      try {
        sessionStorage.setItem(STORE, temp.toFixed(3));
        if (burnt) sessionStorage.setItem(BURNT, '1');
      } catch {
        // Nothing to keep it in; it simply starts warm next time.
      }
    };

    const frame = (now: number) => {
      const s = settings.current;
      // Time away (the pointer outside, the tab hidden) counts as cold, but only up to 10 seconds.
      const dt = last < 0 ? 0 : Math.min(10, (now - last) / 1000);
      last = now;
      time += dt;
      const warm = inside ? warmthAt() : 0;
      temp = Math.min(1, Math.max(0, temp + dt * (warm / s.thaw - (1 - warm) / s.chill)));
      // Fully warm and still in the heart of the fire, it overheats; anywhere else it cools off.
      if (temp >= 1 && warm > HEART && !burnt) {
        heat = Math.min(1, heat + (dt * (0.5 + (warm - HEART) / (1 - HEART))) / s.scorch);
      } else heat = Math.max(0, heat - dt / 2);
      if (heat >= 1 && !burnt) {
        burnt = true;
        burning = 2.6;
        heat = 0;
        temp = 0.9;
        save();
        burnCursor();
        for (let k = 0; k < 7; k++) {
          puffs.push({ x: x + (k - 3) * 5, y: y - 4 - k * 2, age: -k * 0.08, smoke: true });
        }
      }
      burning = Math.max(0, burning - dt);

      const motion = !s.reduced;
      if (inside && motion && temp < 0.45) {
        breathOwed += dt / (0.7 + temp * 1.6);
        while (breathOwed >= 1) {
          breathOwed -= 1;
          puffs.push({ x: x + 10, y: y - 8, age: 0, smoke: false });
        }
      } else breathOwed = 0;
      // An overheating pointer smokes, faster the hotter it gets.
      if (inside && motion && heat > 0.35) {
        smokeOwed += dt * (2 + heat * 6);
        while (smokeOwed >= 1) {
          smokeOwed -= 1;
          puffs.push({ x: x + 4 + Math.random() * 6, y: y - 10, age: 0, smoke: true });
        }
      } else smokeOwed = 0;
      for (let i = puffs.length - 1; i >= 0; i--) {
        const puff = puffs[i]!;
        puff.age += dt;
        puff.y -= dt * (puff.smoke ? 26 : 18);
        puff.x += dt * (puff.smoke ? Math.sin(puff.age * 5 + i) * 16 : 14);
        if (puff.age > 1.5) puffs.splice(i, 1);
      }

      // A freezing pointer shivers: a small, uneven tremble, a few times a frame-second.
      const shiver = inside && motion ? Math.max(0, (0.15 - temp) / 0.15) : 0;
      if (shiver > 0 && time - shakeAt > 0.035) {
        shakeAt = time;
        const amp = 0.6 + shiver * 1.6;
        shakeX = (Math.random() * 2 - 1) * amp;
        shakeY = (Math.random() * 2 - 1) * amp * 0.6;
      } else if (shiver === 0) {
        shakeX = 0;
        shakeY = 0;
      }
      const cx = x + shakeX;
      const cy = y + shakeY;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 13px ${MONO_STACK}`;
      for (const puff of puffs) {
        if (puff.age < 0) continue;
        const t = puff.age / 1.5;
        if (puff.smoke) {
          ctx.globalAlpha = (1 - t) * 0.7;
          ctx.fillStyle = t < 0.25 ? '#a39890' : '#7a736e';
          ctx.fillText(t < 0.35 ? '~' : t < 0.7 ? '≈' : '·', puff.x, puff.y);
        } else {
          ctx.globalAlpha = (1 - t) * 0.6;
          ctx.fillStyle = '#e6ecfb';
          ctx.fillText(t < 0.3 ? 'o' : t < 0.65 ? '°' : '.', puff.x, puff.y);
        }
      }
      if (inside && motion) {
        // Frost closes in round a cold pointer.
        const cold = Math.min(1, Math.max(0, (0.5 - temp) / 0.5));
        const crystals = Math.round(cold * 8);
        const r = 26 - cold * 8;
        ctx.fillStyle = s.frost;
        for (let k = 0; k < crystals; k++) {
          const a = (k / 8) * Math.PI * 2 + time * 0.35;
          ctx.globalAlpha = 0.4 + cold * 0.55;
          ctx.fillText(k % 2 ? '+' : '*', cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        // Embers circle a warm one, more of them and redder as it overheats.
        const glow = Math.min(1, Math.max(0, (temp - 0.55) / 0.45)) * (warm > 0.05 ? 1 : 0.5);
        if (glow > 0.05) {
          const count = 3 + Math.round(heat * 4);
          ctx.fillStyle = heat > 0.35 ? HOT : s.ember;
          for (let k = 0; k < count; k++) {
            const a = (k / count) * Math.PI * 2 - time * (1 + warm * 2 + heat * 2);
            const reach = 18 - heat * 4;
            ctx.globalAlpha = glow * 0.85;
            ctx.fillText(k ? '.' : '*', cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
          }
        }
      }
      ctx.globalAlpha = 1;

      // The reading rides beside the pointer in a small pill of dark glass, whenever it is inside.
      if (inside) {
        const degrees = Math.round(
          heat > 0 ? WARMEST + heat * (HOTTEST - WARMEST) : COLDEST + temp * (WARMEST - COLDEST),
        );
        const mood = burning > 0 ? 'burnt!' : moodOf(temp, heat, warm);
        const reading =
          burning > 0
            ? `burnt! ${HOTTEST}°`
            : `${mood} ${degrees < 0 ? '−' : ''}${Math.abs(degrees)}°`;
        if (reading !== shown) {
          label.textContent = reading;
          shown = reading;
          pillWidth = pill.offsetWidth;
        }
        const tone =
          burning > 0 || heat > 0.35
            ? HOT
            : temp < 0.4
              ? s.frost
              : warm > 0.15 || temp > 0.85 || heat > 0
                ? s.ember
                : MILD;
        pill.style.color = tone;
        dot.style.background = tone;
        dot.style.boxShadow = `0 0 6px ${tone}`;
        const left = cx + 18 + pillWidth < window.innerWidth - 8 ? cx + 18 : cx - 18 - pillWidth;
        pill.style.transform = `translate3d(${left}px, ${cy + 14}px, 0)`;
        pill.style.opacity = '1';
      } else pill.style.opacity = '0';

      if (inside || puffs.length || burning > 0) raf = requestAnimationFrame(frame);
      else {
        // Nothing left to draw: clear once and sleep until the pointer comes back.
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        pill.style.opacity = '0';
        raf = 0;
        save();
      }
    };

    // The clock is not reset on waking: the time asleep is counted, up to 10 seconds of cold.
    const wake = () => {
      if (last < 0) last = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // Inside is where the pointer is, not what is under it, so text, overlays or a selection on
    // top of the area never switch it off.
    const within = () => {
      const area = settings.current.scope;
      if (!area) return true;
      for (const element of document.querySelectorAll(area)) {
        const box = element.getBoundingClientRect();
        if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return true;
      }
      return false;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      inside = within();
      if (inside) wake();
    };
    // Scrolling moves the area under a still pointer.
    const onScroll = () => {
      if (last < 0) return;
      inside = within();
      if (inside) wake();
    };
    const onLeave = () => {
      inside = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', save);
    return () => {
      cancelAnimationFrame(raf);
      save();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pagehide', save);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="lilt-cursor-warmth"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      />
      <span
        ref={pillRef}
        aria-hidden="true"
        className="lilt-cursor-warmth__reading"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 61,
          display: 'inline-flex',
          height: 22,
          alignItems: 'center',
          gap: 6,
          padding: '0 9px 0 8px',
          border: '1px solid rgb(255 255 255 / 0.12)',
          borderRadius: 999,
          background: 'rgb(16 14 24 / 0.5)',
          boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.08), 0 6px 16px -6px rgb(0 0 0 / 0.5)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
          backdropFilter: 'blur(12px) saturate(1.5)',
          font: `500 11px ${MONO_STACK}`,
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 160ms ease, color 240ms ease',
          willChange: 'transform',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 999 }} />
        <span />
      </span>
    </>
  );
}
