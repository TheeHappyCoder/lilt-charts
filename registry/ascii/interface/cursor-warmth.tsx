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
  /** Colour of the frost and of a cold reading. Default an icy blue. */
  frost?: string;
  /** Colour of the embers and of a warm reading. Default amber. */
  ember?: string;
}

/** Where the temperature is kept for the tab, so a cold pointer stays cold from page to page. */
const STORE = 'lilt-cursor-warmth';

interface Puff {
  x: number;
  y: number;
  age: number;
}

/** What the reading says, in a word, or nothing while the pointer is neither cold nor by a fire. */
function moodOf(temp: number, warm: number) {
  if (temp < 0.15) return 'freezing';
  if (temp < 0.4) return 'brr';
  if (warm > 0.15) return temp > 0.75 ? 'cosy' : 'warming up';
  return '';
}

/**
 * The pointer has a temperature. Away from any fire it slowly cools: frost crystals close in round
 * it and its breath shows. Near a fire (any element marked `data-lilt-fire`) it thaws in a few
 * seconds and embers circle it. A small reading beside it says how it is doing, such as
 * `brr −6°` or `cosy 21°`, in a small pill of dark glass. It draws on one fixed canvas above the
 * page that never takes the pointer, sleeps when there is nothing to draw, skips touch, and keeps
 * only the reading with reduced motion.
 */
export function CursorWarmth({
  scope,
  fires = '[data-lilt-fire]',
  chill = 25,
  thaw = 3,
  frost = '#a9d8ff',
  ember = '#ffb22e',
}: CursorWarmthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const settings = useRef({ scope, fires, chill, thaw, frost, ember, reduced });
  settings.current = { scope, fires, chill, thaw, frost, ember, reduced };

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
    try {
      const saved = Number(sessionStorage.getItem(STORE));
      if (saved >= 0 && saved <= 1 && sessionStorage.getItem(STORE) !== null) temp = saved;
    } catch {
      // Storage can be unavailable; the pointer starts warm.
    }
    let x = 0;
    let y = 0;
    let inside = false;
    let raf = 0;
    // Unset until the pointer first comes in: time before that is not time in the cold.
    let last = -1;
    let time = 0;
    let breathOwed = 0;
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

      const motion = !s.reduced;
      if (inside && motion && temp < 0.45) {
        breathOwed += dt / (0.7 + temp * 1.6);
        while (breathOwed >= 1) {
          breathOwed -= 1;
          puffs.push({ x: x + 10, y: y - 8, age: 0 });
        }
      } else breathOwed = 0;
      for (let i = puffs.length - 1; i >= 0; i--) {
        const puff = puffs[i]!;
        puff.age += dt;
        puff.y -= dt * 18;
        puff.x += dt * 14;
        if (puff.age > 1.5) puffs.splice(i, 1);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 13px ${MONO_STACK}`;
      for (const puff of puffs) {
        const t = puff.age / 1.5;
        ctx.globalAlpha = (1 - t) * 0.6;
        ctx.fillStyle = '#e6ecfb';
        ctx.fillText(t < 0.3 ? 'o' : t < 0.65 ? '°' : '.', puff.x, puff.y);
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
          ctx.fillText(k % 2 ? '+' : '*', x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        // Embers circle a warm one.
        const glow = Math.min(1, Math.max(0, (temp - 0.55) / 0.45)) * (warm > 0.05 ? 1 : 0.5);
        if (glow > 0.05) {
          ctx.fillStyle = s.ember;
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 - time * (1 + warm * 2);
            ctx.globalAlpha = glow * 0.85;
            ctx.fillText(k ? '.' : '*', x + Math.cos(a) * 18, y + Math.sin(a) * 18);
          }
        }
      }
      ctx.globalAlpha = 1;
      // The reading rides beside the pointer in a small pill of dark glass.
      const mood = inside ? moodOf(temp, warm) : '';
      if (mood) {
        const degrees = Math.round(-12 + temp * 36);
        const reading = `${mood} ${degrees < 0 ? '−' : ''}${Math.abs(degrees)}°`;
        if (reading !== shown) {
          label.textContent = reading;
          shown = reading;
          pillWidth = pill.offsetWidth;
        }
        const tone = temp < 0.4 ? s.frost : s.ember;
        pill.style.color = tone;
        dot.style.background = tone;
        dot.style.boxShadow = `0 0 6px ${tone}`;
        const left = x + 18 + pillWidth < window.innerWidth - 8 ? x + 18 : x - 18 - pillWidth;
        pill.style.transform = `translate3d(${left}px, ${y + 14}px, 0)`;
        pill.style.opacity = '1';
      } else pill.style.opacity = '0';

      if (inside || puffs.length) raf = requestAnimationFrame(frame);
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

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      const area = settings.current.scope;
      const target = event.target instanceof Element ? event.target : null;
      inside = !area || !!target?.closest(area);
      if (inside) wake();
    };
    const onLeave = () => {
      inside = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', save);
    return () => {
      cancelAnimationFrame(raf);
      save();
      window.removeEventListener('pointermove', onMove);
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
          transition: 'opacity 160ms ease',
          willChange: 'transform',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 999 }} />
        <span />
      </span>
    </>
  );
}
