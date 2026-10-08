'use client';

import { useEffect, useRef, useState } from 'react';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { useHomeLook } from '@/components/home/home-look';
import { heroWithLook, sceneAlone } from '@/lib/home-hero';

type Stop = 'hero' | 'studio' | 'interactions' | 'code';

/** Where a resting card sits on screen, as a function of the page's scroll position. */
interface Track {
  left: number;
  width: number;
  top: (scroll: number) => number;
}

interface Leg {
  from: Stop;
  to: Stop;
  start: number;
  end: number;
  a: Track;
  b: Track;
}

/** How far the card tilts, turns and lifts at the top of each arc. */
const TILT = 6;
const TURN = -1.5;
const LIFT = 0.02;
/** Keyframes per leg: enough that the eased path reads as a curve. */
const SAMPLES = 48;
/** Scroll distance either side of a leg where the copy rides exactly over the real card. */
const OVERLAP = 24;
/** Wide screens get the whole journey; narrow ones keep the first flight. */
const WIDE = '(min-width: 1081px)';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** An element's place in the scroller's content, ignoring any transforms. */
function contentBox(element: HTMLElement, page: HTMLElement) {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== page) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: element.offsetWidth };
}

/** An element in the page's flow: it rises one pixel for every pixel scrolled. */
function inFlow(element: HTMLElement, page: HTMLElement): Track {
  const box = contentBox(element, page);
  return { left: box.left, width: box.width, top: (scroll) => box.top - scroll };
}

type ScrollTimelineConstructor = new (options: {
  source: Element;
  axis: 'block';
}) => AnimationTimeline;

/**
 * The home page's one chart in flight. A single copy of the card travels between the places the
 * real card rests: the hero, the looks studio, the interactions and the code.
 *
 * The whole path is measured once per layout and baked into keyframes on a scroll timeline, so
 * the browser plays it on the same thread that scrolls the page: the copy can never trail the
 * scroll by a frame. Only transform and opacity move. Either side of each leg the copy rides
 * exactly over the real card for a few pixels, so swapping which one is seen never flickers.
 * Browsers without scroll timelines, and reduced motion, keep every card where it is.
 */
export function HomeFlight() {
  const { look, scene } = useHomeLook();
  const flyer = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const [carryScene, setCarryScene] = useState(false);

  useEffect(() => {
    const card = flyer.current;
    const glow = shadow.current;
    const page = card?.closest<HTMLElement>('.lilt-home');
    const hero = page?.querySelector<HTMLElement>('.lilt-home__hero-chart .lilt-card');
    const Timeline = (window as unknown as { ScrollTimeline?: ScrollTimelineConstructor })
      .ScrollTimeline;
    if (!card || !glow || !page || !hero || !Timeline) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const slot = (name: Stop) => page.querySelector<HTMLElement>(`[data-flight-slot="${name}"]`);
    const elements: Record<Stop, HTMLElement | null> = {
      hero,
      studio: slot('studio'),
      interactions: slot('interactions'),
      code: slot('code'),
    };
    const wide = window.matchMedia(WIDE);
    let legs: Leg[] = [];
    let animations: Animation[] = [];

    const plan = () => {
      const width = hero.offsetWidth;
      page.style.setProperty('--flight-width', `${width}px`);
      const view = page.clientHeight;
      const studio = elements.studio;
      const scrolly = studio?.closest<HTMLElement>('.lilt-story-studio__scrolly');
      const stage = studio?.parentElement;
      if (!studio || !scrolly || !stage) return [];
      // The studio's card is sticky: it rises with the page, holds while pinned, then rises again.
      const stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
      const pin = contentBox(scrolly, page).top - stickyTop;
      const unpin = pin + scrolly.offsetHeight - stage.offsetHeight;
      const studioBox = contentBox(studio, page);
      const sticky: Track = {
        left: studioBox.left,
        width: studioBox.width,
        top: (scroll) => stickyTop - Math.max(0, scroll - unpin) + Math.max(0, pin - scroll),
      };
      const next: Leg[] = [
        // Starting a little down the page keeps the copy off the hero while the reader is on it.
        {
          from: 'hero',
          to: 'studio',
          start: OVERLAP + 8,
          end: pin,
          a: inFlow(hero, page),
          b: sticky,
        },
      ];
      const interactions = elements.interactions;
      const code = elements.code;
      if (wide.matches && interactions && code) {
        // A dock holds the card in the middle of the screen, clear of the floating header.
        const dock = (element: HTMLElement) =>
          contentBox(element, page).top - Math.max(104, (view - element.offsetHeight) / 2);
        const docked = dock(interactions);
        const coded = dock(code);
        next.push(
          {
            from: 'studio',
            to: 'interactions',
            start: unpin,
            end: docked,
            a: sticky,
            b: inFlow(interactions, page),
          },
          {
            from: 'interactions',
            to: 'code',
            start: Math.min(docked + view * 0.45, coded - view * 0.4),
            end: coded,
            a: inFlow(interactions, page),
            b: inFlow(code, page),
          },
        );
      }
      return next.filter((leg) => leg.end > leg.start);
    };

    const build = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
      legs = plan();
      const range = page.scrollHeight - page.clientHeight;
      if (!legs.length || range <= 0) return;
      const width = hero.offsetWidth;
      const frames: Keyframe[] = [];
      const glows: Keyframe[] = [];
      const at = (scroll: number) => clamp(scroll / range);
      const pose = (track: Track, scroll: number, arc = 0, size = track.width / width) =>
        `translate3d(${track.left}px, ${track.top(scroll)}px, 0) perspective(1600px) ` +
        `rotateX(${arc * TILT}deg) rotateZ(${arc * TURN}deg) scale(${size * (1 + arc * LIFT)})`;
      const push = (scroll: number, transform: string, opacity: number, lift: number) => {
        const offset = at(scroll);
        const last = frames[frames.length - 1];
        if (last && (last.offset as number) > offset) return;
        frames.push({ offset, transform, opacity });
        glows.push({ offset, opacity: lift });
      };
      legs.forEach((leg) => {
        const before = leg.start - OVERLAP;
        const after = leg.end + OVERLAP;
        // Hidden until just before the leg, then riding the real card it is about to lift.
        push(Math.max(0, before - 1), pose(leg.a, before), 0, 0);
        push(Math.max(0, before), pose(leg.a, before), 1, 0);
        for (let index = 0; index <= SAMPLES; index += 1) {
          const progress = index / SAMPLES;
          const scroll = leg.start + (leg.end - leg.start) * progress;
          const t = easeInOut(progress);
          const arc = Math.sin(Math.PI * progress);
          const top = leg.a.top(scroll) + (leg.b.top(scroll) - leg.a.top(scroll)) * t;
          const left = leg.a.left + (leg.b.left - leg.a.left) * t;
          const size = (leg.a.width + (leg.b.width - leg.a.width) * t) / width;
          const track: Track = { left, width, top: () => top };
          push(scroll, pose(track, scroll, arc, size), 1, arc);
        }
        // Riding the real card it has just set down, then hidden.
        push(after, pose(leg.b, after), 1, 0);
        push(after + 1, pose(leg.b, after), 0, 0);
      });
      if (frames.length < 2) return;
      const timeline = new Timeline({ source: page, axis: 'block' });
      const options = { timeline, fill: 'both', easing: 'linear' } as KeyframeAnimationOptions;
      animations = [card.animate(frames, options), glow.animate(glows, options)];
      // The real cards hide while their copy is in the air, on the same timeline, so the browser
      // swaps the two in one frame however far a single scroll step jumps. Inside the copy's
      // overlap either side, the two are identical and stacked, so neither edge can blink.
      const step = 1 / range;
      for (const stop of new Set(legs.flatMap((leg) => [leg.from, leg.to]))) {
        const element = elements[stop];
        if (!element) continue;
        const shown: Keyframe[] = [{ offset: 0, opacity: 1 }];
        for (const leg of legs) {
          if (leg.from !== stop && leg.to !== stop) continue;
          const start = at(leg.start);
          const end = at(leg.end);
          shown.push(
            { offset: Math.max(0, start - step), opacity: 1 },
            { offset: start, opacity: 0 },
            { offset: end, opacity: 0 },
            { offset: Math.min(1, end + step), opacity: 1 },
          );
        }
        shown.push({ offset: 1, opacity: 1 });
        animations.push(element.animate(shown, options));
      }
    };

    // What the copy carries, and whether a hand-off is near, change only around the legs' ends.
    const sync = () => {
      const scroll = page.scrollTop;
      // Near any leg, interactions that would make the real card differ from the copy wait.
      page.toggleAttribute(
        'data-flight-near',
        legs.some((item) => scroll > item.start - OVERLAP * 4 && scroll < item.end + OVERLAP * 4),
      );
      setCarryScene(legs.length > 1 && scroll > legs[1]!.start - OVERLAP * 2);
    };

    build();
    sync();
    page.addEventListener('scroll', sync, { passive: true });
    let frame = 0;
    const rebuild = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        build();
        sync();
      });
    };
    const observer = new ResizeObserver(rebuild);
    observer.observe(page.querySelector('.lilt-story') ?? page);
    observer.observe(hero);
    wide.addEventListener('change', rebuild);

    return () => {
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      page.removeEventListener('scroll', sync);
      observer.disconnect();
      wide.removeEventListener('change', rebuild);
      page.removeAttribute('data-flight-near');
      page.style.removeProperty('--flight-width');
    };
  }, []);

  return (
    <div ref={flyer} className="lilt-flight" aria-hidden="true" inert>
      <span ref={shadow} className="lilt-flight__shadow" />
      <CardExamplePreview
        example={heroWithLook(look, carryScene ? sceneAlone(scene, 'home-flight') : {})}
      />
    </div>
  );
}
