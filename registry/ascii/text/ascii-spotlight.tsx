'use client';

import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent,
} from 'react';
import { MONO_STACK, fitCanvas } from '../interface/motion';
import { CODE_GLYPHS, VISUALLY_HIDDEN, frame, rand, useReducedMotion, useSeen } from './text-kit';

export interface AsciiSpotlightProps {
  /** The heading. Default 'Look closer'. */
  text?: string;
  /** Gradient stops the lit letters and glyphs take, left to right. */
  colors?: readonly string[];
  /** Radius of the light, in pixels. Default 150. */
  radius?: number;
  /** Characters hidden in the dark. */
  characters?: string;
  /** Font size of the hidden glyphs, in pixels. Default 12. */
  glyphSize?: number;
  /** Sweep the light across once when it first scrolls into view. Default true. */
  sweep?: boolean;
  /** The element to render, such as 'h1'. Default 'span'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** How far past the heading the hidden field reaches, in pixels. */
const BLEED = 48;

/**
 * A heading with something hidden behind it. The pointer is a torch: where it shines, a field of
 * type appears in the dark around the words and the letters it touches light up in colour. It
 * sweeps across once by itself when it first comes into view, so touch screens see it too.
 */
export function AsciiSpotlight({
  text = 'Look closer',
  colors = ['#7c5cff', '#e5489c', '#ffb36b'],
  radius = 150,
  characters = CODE_GLYPHS,
  glyphSize = 12,
  sweep = true,
  as = 'span',
  className,
  style,
}: AsciiSpotlightProps) {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lit = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const seen = useSeen(host, sweep && !reduced);
  // Where the light is, in pixels from the heading's top left, and how bright, 0 → 1.
  const light = useRef({ x: -999, y: -999, on: 0, target: 0 });
  const running = useRef(false);
  const kick = useRef<() => void>(() => undefined);
  const gradient = `linear-gradient(90deg, ${colors.length ? colors.join(', ') : 'currentColor, currentColor'})`;

  useEffect(() => {
    const el = host.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const set = characters || CODE_GLYPHS;
    let cancel = () => undefined as void;

    const paint = (now: number) => {
      const state = light.current;
      state.on += (state.target - state.on) * 0.18;
      const box = el.getBoundingClientRect();
      const w = box.width + BLEED * 2;
      const h = box.height + BLEED * 2;
      const dpr = fitCanvas(cv, w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // The lit letters follow the same light.
      // The lit copy sits where the words do, which may be inset when the heading is centred.
      const words = lit.current?.getBoundingClientRect();
      const dx = words ? words.left - box.left : 0;
      const dy = words ? words.top - box.top : 0;
      lit.current?.style.setProperty('--lilt-spot-x', `${state.x - dx}px`);
      lit.current?.style.setProperty('--lilt-spot-y', `${state.y - dy}px`);
      lit.current?.style.setProperty('--lilt-spot-r', `${radius * state.on}px`);
      if (state.on > 0.01) {
        ctx.font = `500 ${glyphSize}px ${MONO_STACK}`;
        ctx.textBaseline = 'middle';
        const cw = ctx.measureText('M').width || glyphSize * 0.6;
        const ch = glyphSize * 1.3;
        const tick = Math.floor(now / 90);
        const fill = ctx.createLinearGradient(0, 0, w, 0);
        (colors.length ? colors : ['#888']).forEach((c, i, all) =>
          fill.addColorStop(all.length === 1 ? 0 : i / (all.length - 1), c),
        );
        ctx.fillStyle = fill;
        const cx = state.x + BLEED;
        const cy = state.y + BLEED;
        const r = radius * state.on;
        for (
          let row = Math.max(0, Math.floor((cy - r) / ch));
          row * ch < Math.min(h, cy + r);
          row++
        ) {
          for (
            let col = Math.max(0, Math.floor((cx - r) / cw));
            col * cw < Math.min(w, cx + r);
            col++
          ) {
            const d = Math.hypot(col * cw + cw / 2 - cx, row * ch + ch / 2 - cy) / r;
            if (d > 1) continue;
            // Glyphs change now and then, each on its own beat.
            const g =
              set[
                Math.floor(
                  rand(col, row + Math.floor(tick * (0.2 + rand(col, row, 3))), 7) * set.length,
                )
              ];
            ctx.globalAlpha = (1 - d) ** 1.4 * 0.75;
            ctx.fillText(g ?? '.', col * cw, row * ch + ch / 2);
          }
        }
        ctx.globalAlpha = 1;
      }
      if (state.on > 0.005 || state.target > 0) cancel = frame(paint);
      else running.current = false;
    };
    kick.current = () => {
      if (running.current) return;
      running.current = true;
      cancel = frame(paint);
    };
    return () => {
      cancel();
      running.current = false;
    };
  }, [characters, colors, glyphSize, radius]);

  // The first sweep: the light crosses from left to right, then goes out.
  useEffect(() => {
    if (!seen || reduced || !host.current) return;
    const box = host.current.getBoundingClientRect();
    const start = performance.now();
    let cancel = () => undefined as void;
    const move = (now: number) => {
      const t = Math.min(1, (now - start) / 1600);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      light.current.x = -radius * 0.5 + eased * (box.width + radius);
      light.current.y = box.height / 2;
      light.current.target = t < 1 ? 1 : 0;
      kick.current();
      if (t < 1) cancel = frame(move);
    };
    cancel = frame(move);
    return () => cancel();
  }, [seen, reduced, radius]);

  const follow = (event: PointerEvent<HTMLElement>) => {
    if (reduced) return;
    const box = event.currentTarget.getBoundingClientRect();
    light.current.x = event.clientX - box.left;
    light.current.y = event.clientY - box.top;
    light.current.target = 1;
    kick.current();
  };

  const mask =
    'radial-gradient(circle var(--lilt-spot-r, 0px) at var(--lilt-spot-x, -999px) var(--lilt-spot-y, -999px), #000 30%, transparent 100%)';
  return createElement(
    as,
    {
      ref: host,
      className,
      style: { position: 'relative', display: 'inline-block', isolation: 'isolate', ...style },
      onPointerMove: follow,
      onPointerEnter: follow,
      onPointerLeave: () => {
        light.current.target = 0;
        kick.current();
      },
    },
    <canvas
      ref={canvas}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: -BLEED,
        top: -BLEED,
        width: `calc(100% + ${BLEED * 2}px)`,
        height: `calc(100% + ${BLEED * 2}px)`,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />,
    <span style={VISUALLY_HIDDEN}>{text}</span>,
    <span aria-hidden="true" style={{ position: 'relative', display: 'inline-block' }}>
      {text}
      <span
        ref={lit}
        style={{
          position: 'absolute',
          inset: 0,
          color: 'transparent',
          background: gradient,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitMaskImage: mask,
          maskImage: mask,
          pointerEvents: 'none',
        }}
      >
        {text}
      </span>
    </span>,
  );
}
