import { useEffect, useRef, useState } from 'react';

/**
 * Items that just left the data, kept for `duration` milliseconds so they can animate out
 * instead of vanishing. Changes are detected by key, so a list rebuilt every render is fine, and
 * each departing item keeps the last place it was drawn. Derived while rendering, so it is never
 * missing for a frame before its exit starts; an item that comes back stops departing at once.
 */
export function useDeparting<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  duration: number,
): readonly T[] {
  const signature = items.map(keyOf).join('\u0000');
  const [seen, setSeen] = useState(signature);
  const [departing, setDeparting] = useState<readonly T[]>([]);
  const drawn = useRef(items);
  if (signature !== seen) {
    const present = new Set(items.map(keyOf));
    const gone = drawn.current.filter((item) => !present.has(keyOf(item)));
    const goneKeys = new Set(gone.map(keyOf));
    setSeen(signature);
    setDeparting((current) => [
      ...current.filter((item) => !present.has(keyOf(item)) && !goneKeys.has(keyOf(item))),
      ...gone,
    ]);
  }
  useEffect(() => {
    drawn.current = items;
  });
  useEffect(() => {
    if (!departing.length) return;
    const timer = window.setTimeout(() => setDeparting([]), duration);
    return () => window.clearTimeout(timer);
  }, [departing, duration]);
  return departing;
}
