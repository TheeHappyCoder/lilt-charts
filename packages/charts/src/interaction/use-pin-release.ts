import { useEffect, useRef } from 'react';

/**
 * Lets go of a card's pin the way a Cartesian chart does: on any press that misses the marks,
 * whether on empty plot, elsewhere in the card, or off it, and on Escape while the card has the
 * keyboard (focus inside it, or the last press landed in it). Presses on controls keep the pin,
 * so a legend item or period menu decides for itself.
 */
export function usePinRelease(
  root: Element | null,
  pinned: boolean,
  release: (() => void) | undefined,
  /** Whether a press inside the plot landed on a mark. */
  onMark: (event: PointerEvent, root: Element) => boolean,
): void {
  const latest = useRef({ release, onMark });
  latest.current = { release, onMark };
  const ownsKeyboard = useRef(false);

  useEffect(() => {
    if (!root) return;
    const card = () => root.closest('[data-lilt-chart]') ?? root;
    const onPress = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      ownsKeyboard.current = Boolean(target && card().contains(target));
      if (!pinned) return;
      if (target instanceof Element && target.closest('button, a, input, [role="tab"]')) {
        // A mark drawn as a button (a heatmap cell, a ranking row) still counts as a mark.
        if (!root.contains(target) || !target.closest('[data-glide-id]')) return;
      }
      if (target && root.contains(target)) {
        if (target instanceof Element && target.closest('[data-glide-id]')) return;
        if (latest.current.onMark(event, root)) return;
      }
      latest.current.release?.();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!pinned || event.key !== 'Escape' || event.defaultPrevented) return;
      const target = event.target instanceof Node ? event.target : null;
      const inside = Boolean(target && card().contains(target));
      if (!inside && !ownsKeyboard.current) return;
      // Another chart, or a dialog outside this card, owns that Escape.
      if (
        !inside &&
        target instanceof Element &&
        target.closest('[data-lilt-chart], [role="dialog"]')
      )
        return;
      event.preventDefault();
      latest.current.release?.();
    };
    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [root, pinned]);
}
