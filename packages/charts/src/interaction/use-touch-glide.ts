import { useEffect, useRef, useState } from 'react';
import { usePinRelease } from './use-pin-release';

/** How long a still finger rests before it glides in any direction instead of scrolling. */
export const TOUCH_HOLD_MS = 320;
/** How far a finger travels before it counts as a swipe rather than a tap. */
export const TOUCH_SLOP = 8;

export interface TouchGlideOptions<T> {
  /** What sits under the finger: an item id, a spoke index, or null for empty glass. */
  resolve: (clientX: number, clientY: number, root: Element) => T | null;
  /** Called as the finger glides, and with null when the gesture ends without a lift. */
  onGlide: (value: T | null) => void;
  /** A glide lifted over an item: pin it. */
  onLift?: (value: T | null) => void;
  /** A tap with no glide. Leave unset where the item's own click already handles taps. */
  onTap?: (value: T | null) => void;
  disabled?: boolean;
  /** Whether the card holds a pin, so Escape or a press that misses the marks lets it go. */
  pinned?: boolean;
  /** Releases the pin. See `usePinRelease`. */
  onRelease?: () => void;
}

/** Finds the nearest `data-glide-id` under a point, for families whose marks are elements. */
export function glideTarget(clientX: number, clientY: number, root: Element): string | null {
  const hit = root.ownerDocument.elementFromPoint?.(clientX, clientY);
  const item = hit?.closest('[data-glide-id]');
  return item && root.contains(item) ? item.getAttribute('data-glide-id') : null;
}

/**
 * Touch for charts whose marks are separate elements, or are found by position. A finger has no
 * hover and a touch stays with the element it first landed on, so this follows the point under
 * the finger instead. A sideways swipe glides at once (the plot pans only vertically); a press and
 * hold glides in any direction without scrolling the page; lifting after a glide pins.
 *
 * Returns a callback ref for the plot, so a plot that mounts after loading is still wired.
 */
export function useTouchGlide<T>(options: TouchGlideOptions<T>): (node: Element | null) => void {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { disabled } = options;
  const [root, setRoot] = useState<Element | null>(null);
  usePinRelease(
    root,
    options.pinned ?? false,
    options.onRelease,
    (event, plot) => optionsRef.current.resolve(event.clientX, event.clientY, plot) !== null,
  );

  useEffect(() => {
    if (!root || disabled) return;
    let gesture: {
      pointerId: number;
      x: number;
      y: number;
      gliding: boolean;
      hold: number | null;
    } | null = null;
    let frame: number | null = null;
    let latest: { clientX: number; clientY: number } | null = null;
    let suppressUntil = 0;

    const pick = (clientX: number, clientY: number) =>
      optionsRef.current.resolve(clientX, clientY, root);
    const stopHold = () => {
      if (gesture?.hold != null) window.clearTimeout(gesture.hold);
      if (gesture) gesture.hold = null;
    };
    const flush = () => {
      frame = null;
      if (gesture?.gliding && latest)
        optionsRef.current.onGlide(pick(latest.clientX, latest.clientY));
    };
    const glide = (clientX: number, clientY: number) => {
      latest = { clientX, clientY };
      if (frame === null) frame = window.requestAnimationFrame(flush);
    };
    const begin = () => {
      if (!gesture || gesture.gliding) return;
      stopHold();
      gesture.gliding = true;
      try {
        (root as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
          gesture.pointerId,
        );
      } catch {
        // The pointer may already be gone; the glide still reads positions.
      }
      optionsRef.current.onGlide(pick(gesture.x, gesture.y));
    };
    const end = () => {
      stopHold();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      latest = null;
      gesture = null;
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      end();
      gesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        gliding: false,
        hold: window.setTimeout(begin, TOUCH_HOLD_MS),
      };
    };
    const onMove = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (gesture.gliding) {
        glide(event.clientX, event.clientY);
        return;
      }
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (Math.max(dx, dy) <= TOUCH_SLOP) return;
      // Up and down belongs to the page, which is about to take it and cancel this pointer.
      if (dy >= dx) {
        stopHold();
        return;
      }
      begin();
      glide(event.clientX, event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const { gliding, hold } = gesture;
      const tapped = !gliding && hold !== null;
      end();
      const value = pick(event.clientX, event.clientY);
      if (gliding) {
        optionsRef.current.onGlide(null);
        optionsRef.current.onLift?.(value);
        suppressUntil = performance.now() + 750;
      } else if (tapped && optionsRef.current.onTap) {
        optionsRef.current.onTap(value);
        suppressUntil = performance.now() + 750;
      }
    };
    const onCancel = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const gliding = gesture.gliding;
      end();
      if (gliding) optionsRef.current.onGlide(null);
    };
    // Once a glide owns the finger, the page must not scroll under it. Only a touch listener that
    // is not passive can say so; pointer events cannot.
    const onTouchMove = (event: TouchEvent) => {
      if (gesture?.gliding && event.cancelable) event.preventDefault();
    };
    // A long press would otherwise open the system menu or start selecting text.
    const onContextMenu = (event: Event) => {
      if (gesture) event.preventDefault();
    };
    // The click that follows a glide or a handled tap would toggle the pin straight back.
    const onClick = (event: Event) => {
      if (performance.now() >= suppressUntil) return;
      suppressUntil = 0;
      event.stopPropagation();
      event.preventDefault();
    };

    root.addEventListener('pointerdown', onDown as EventListener);
    root.addEventListener('pointermove', onMove as EventListener);
    root.addEventListener('pointerup', onUp as EventListener);
    root.addEventListener('pointercancel', onCancel as EventListener);
    root.addEventListener('touchmove', onTouchMove as EventListener, { passive: false });
    root.addEventListener('contextmenu', onContextMenu);
    root.addEventListener('click', onClick, true);
    return () => {
      end();
      root.removeEventListener('pointerdown', onDown as EventListener);
      root.removeEventListener('pointermove', onMove as EventListener);
      root.removeEventListener('pointerup', onUp as EventListener);
      root.removeEventListener('pointercancel', onCancel as EventListener);
      root.removeEventListener('touchmove', onTouchMove as EventListener);
      root.removeEventListener('contextmenu', onContextMenu);
      root.removeEventListener('click', onClick, true);
    };
  }, [disabled, root]);

  return setRoot;
}
