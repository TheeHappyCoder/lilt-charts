'use client';

import { useEffect, type RefObject } from 'react';

/** Where the demonstration pointer rests, as [seconds, share of the plot's width]. */
const PATH: readonly (readonly [number, number])[] = [
  [0, 0.14],
  [2.4, 0.58],
  [3.3, 0.58],
  [4.7, 0.84],
  [5.8, 0.84],
  [7.8, 0.3],
  [8.8, 0.3],
  [10, 0.14],
];
const LOOP = PATH[PATH.length - 1]![0];
/** How long the demonstration waits after a person's pointer leaves before it carries on. */
const RESUME = 2200;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function share(time: number) {
  const t = time % LOOP;
  for (let index = 1; index < PATH.length; index += 1) {
    const [end, to] = PATH[index]!;
    const [start, from] = PATH[index - 1]!;
    if (t <= end) return from + (to - from) * easeInOut((t - start) / (end - start || 1));
  }
  return PATH[0]![1];
}

/**
 * Shows an interaction rather than describing it: while the stage is on screen and nobody is
 * using it, a demonstration pointer glides across the first chart and sends it real pointer
 * events, so linked cards answer exactly as they would for a person. A person's pointer, touch
 * or focus takes over at once. Reduced motion never starts it.
 */
export function useGhostPointer(
  stage: RefObject<HTMLElement | null>,
  cursor: RefObject<HTMLElement | null>,
  scene: unknown,
) {
  useEffect(() => {
    const host = stage.current;
    const ghost = cursor.current;
    if (!host || !ghost) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let visible = false;
    let paused = false;
    let resumeTimer = 0;
    let frame = 0;
    let clock = 0;
    let last = 0;
    let target: SVGElement | null = null;

    const send = (type: string, x: number, y: number, related?: Element) =>
      target?.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 99,
          pointerType: 'mouse',
          isPrimary: true,
          relatedTarget: related ?? null,
        }),
      );

    const release = () => {
      if (target) send('pointerout', 0, 0, host);
      target = null;
      ghost.removeAttribute('data-on');
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const delta = last ? Math.min(64, now - last) : 0;
      last = now;
      // While the home page's chart is landing here or leaving, the card must match its copy.
      if (host.closest('[data-flight-near]')) {
        release();
        return;
      }
      if (!visible || paused) return;
      clock += delta / 1000;
      const plot = host.querySelector<SVGElement>('.lilt-chart__svg');
      if (!plot) return;
      if (plot !== target) {
        release();
        target = plot;
      }
      const bounds = plot.getBoundingClientRect();
      const stageBounds = host.getBoundingClientRect();
      const x = bounds.left + bounds.width * share(clock);
      const y = bounds.top + bounds.height * (0.56 + Math.sin(clock * 1.3) * 0.08);
      send('pointermove', x, y);
      ghost.style.transform = `translate3d(${x - stageBounds.left}px, ${y - stageBounds.top}px, 0)`;
      ghost.setAttribute('data-on', '');
    };

    const takeOver = (event: Event) => {
      if (!event.isTrusted) return;
      window.clearTimeout(resumeTimer);
      if (!paused) {
        paused = true;
        release();
      }
    };
    const handBack = (event: Event) => {
      if (!event.isTrusted) return;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        if (host.contains(document.activeElement)) return;
        paused = false;
      }, RESUME);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (!visible) release();
      },
      { threshold: 0.45 },
    );
    observer.observe(host);
    host.addEventListener('pointermove', takeOver);
    host.addEventListener('pointerdown', takeOver);
    host.addEventListener('focusin', takeOver);
    host.addEventListener('pointerleave', handBack);
    host.addEventListener('focusout', handBack);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resumeTimer);
      observer.disconnect();
      release();
      host.removeEventListener('pointermove', takeOver);
      host.removeEventListener('pointerdown', takeOver);
      host.removeEventListener('focusin', takeOver);
      host.removeEventListener('pointerleave', handBack);
      host.removeEventListener('focusout', handBack);
    };
  }, [stage, cursor, scene]);
}
