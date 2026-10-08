import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { film, lerp, onFrame, progress, travel } from './runtime';
import { stage } from './stage';

/**
 * Where the camera looks at time `t`: either a stage point and zoom, or an element (`el`) framed
 * so it fills `fit` of the frame's width (or `fitHeight` of its height, whichever is tighter).
 * `move` is how long the travel into this shot takes, ending at `t`.
 */
export type Shot = {
  t: number;
  move?: number;
  /** Nudge the framed point, in stage pixels. */
  dx?: number;
  dy?: number;
} & (
  | { x: number; y: number; zoom: number }
  | { el: string; fit?: number; fitHeight?: number; zoom?: number; fx?: number; fy?: number }
  /** Halfway between two elements, pulled back: the top of a hop from one card to the next. */
  | { between: [string, string]; zoom: number }
);

interface Resolved {
  x: number;
  y: number;
  zoom: number;
}

/**
 * A camera over a stage, framed in the film's viewport (`stage`). Element shots are measured live in
 * stage coordinates, so they stay right while cards load and settle. The transform is written
 * each frame, outside React.
 */
export function Camera({
  shots,
  width,
  height,
  children,
}: {
  shots: readonly Shot[];
  width: number;
  height: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const world = ref.current!;
    const resolve = (shot: Shot): Resolved => {
      if ('x' in shot)
        return { x: shot.x + (shot.dx ?? 0), y: shot.y + (shot.dy ?? 0), zoom: shot.zoom };
      if ('between' in shot) {
        const a = resolve({ t: shot.t, el: shot.between[0], zoom: shot.zoom });
        const b = resolve({ t: shot.t, el: shot.between[1], zoom: shot.zoom });
        return {
          x: (a.x + b.x) / 2 + (shot.dx ?? 0),
          y: (a.y + b.y) / 2 + (shot.dy ?? 0),
          zoom: shot.zoom,
        };
      }
      const element = world.querySelector<HTMLElement>(shot.el);
      if (!element) return { x: width / 2, y: height / 2, zoom: 1 };
      // Layout coordinates ignore transforms, so the tilt never skews the framing.
      let left = 0;
      let top = 0;
      for (
        let node: HTMLElement | null = element;
        node && node !== world;
        node = node.offsetParent as HTMLElement | null
      ) {
        left += node.offsetLeft;
        top += node.offsetTop;
      }
      const w = element.offsetWidth;
      const h = element.offsetHeight;
      const x = left + w * (shot.fx ?? 0.5) + (shot.dx ?? 0);
      const y = top + h * (shot.fy ?? 0.5) + (shot.dy ?? 0);
      const byWidth = shot.fit ? (stage.w * shot.fit) / w : Infinity;
      const byHeight = shot.fitHeight ? (stage.h * shot.fitHeight) / h : Infinity;
      const zoom = shot.zoom ?? Math.min(byWidth, byHeight);
      return { x, y, zoom: Number.isFinite(zoom) ? zoom : 1 };
    };
    const apply = (t: number) => {
      let index = shots.findIndex((shot) => shot.t > t);
      if (index === -1) index = shots.length;
      const previous = shots[index - 1] ?? shots[0]!;
      const next = shots[index];
      const a = resolve(previous);
      let view = a;
      if (next) {
        const b = resolve(next);
        const move = next.move ?? next.t - previous.t;
        const k = travel(progress(t, next.t - move, next.t));
        // Zoom travels in log space so a 1x→4x push feels even; the framed point follows the
        // zoom so the move reads as one camera, not a pan plus a zoom.
        const zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), k));
        const kz =
          Math.abs(a.zoom - b.zoom) < 1e-3
            ? k
            : (1 / zoom - 1 / a.zoom) / (1 / b.zoom - 1 / a.zoom);
        view = { x: lerp(a.x, b.x, kz), y: lerp(a.y, b.y, kz), zoom };
      }
      film.zoom = view.zoom;
      const tx = stage.w / 2 - view.x * view.zoom;
      const ty = stage.h / 2 - view.y * view.zoom;
      world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${view.zoom})`;
    };
    apply(film.t);
    return onFrame(apply);
  }, [shots, width, height]);
  return (
    <div className="film-camera" ref={ref} style={{ width, height }}>
      {children}
    </div>
  );
}
