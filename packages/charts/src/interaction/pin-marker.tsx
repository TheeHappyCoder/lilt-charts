import { m } from 'motion/react';
import { useLayoutEffect, type ReactElement } from 'react';
import { useGlide } from '../motion/use-glide';
import { SPRING_TRANSITION } from './inspection-layer';
import { PinGlyphs } from './pin-glyphs';

export const PIN_SIZE = 24;

/**
 * The marker above a pinned crosshair. It fades in with a soft blur, follows the pinned point,
 * and releases the pin when clicked; on hover it shows the release glyph instead of the pin.
 * On a linked chart the pin arrived from elsewhere, so the marker is a ghost of the one that
 * was clicked: it still releases the group's pin, but keyboard users meet only the original.
 */
export function PinMarker({
  left,
  top,
  reducedMotion,
  ghost = false,
  from,
  local = false,
  onRelease,
}: {
  left: number;
  top: number;
  reducedMotion: boolean;
  /** Pinned from a linked chart. */
  ghost?: boolean;
  /** The linked chart's name, for the tooltip. */
  from?: string;
  /** Pinned on this chart only. */
  local?: boolean;
  onRelease: () => void;
}): ReactElement {
  const hidden = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.6, y: 4, filter: 'blur(6px)' };
  // Moving to another point uses the crosshair's glide, so the pin travels with it and a slow
  // frame cannot skip it ahead.
  const [x, glideX] = useGlide(left, SPRING_TRANSITION);
  useLayoutEffect(() => glideX(left, reducedMotion), [glideX, left, reducedMotion]);
  const title = ghost
    ? `Pinned from ${from ?? 'a linked chart'}. Click to release.`
    : local
      ? 'Release pin on this chart'
      : 'Release pin. Alt-click a chart to pin just that one.';
  return (
    <m.button
      type="button"
      className="lilt-chart__pin"
      data-ghost={ghost || undefined}
      data-local={local || undefined}
      aria-label={ghost ? undefined : 'Release pinned point'}
      aria-hidden={ghost || undefined}
      tabIndex={ghost ? -1 : undefined}
      title={title}
      style={{ top, left: x }}
      initial={hidden}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={hidden}
      // The pin appears with a soft blur.
      transition={
        reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 30, mass: 0.7 }
      }
      onClick={onRelease}
    >
      <PinGlyphs release />
    </m.button>
  );
}
