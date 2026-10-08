import { useEffect, useRef, useState } from 'react';

/**
 * The pinned category of a card, owned by the card or by its consumer. Controlled when
 * `selected` is not undefined: the card then only requests changes through `onSelectedChange`,
 * and a selection naming a category that is not in the data shows nothing pinned and asks the
 * owner to clear it. Identity is the category's name, so re-ranking or new values keep the pin.
 */
export function useCardSelection(
  selected: string | null | undefined,
  onSelectedChange: ((category: string | null) => void) | undefined,
  categories: readonly string[],
  ready: boolean,
): readonly [
  string | null,
  (next: string | null | ((current: string | null) => string | null)) => void,
] {
  const controlled = selected !== undefined;
  const [own, setOwn] = useState<string | null>(null);
  const wanted = controlled ? selected : own;
  const pinned = wanted !== null && categories.includes(wanted) ? wanted : null;
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;
  const notify = useRef(onSelectedChange);
  notify.current = onSelectedChange;

  // A controlled category that left the data is released by its owner, once data has settled.
  useEffect(() => {
    if (controlled && ready && selected !== null && !categories.includes(selected))
      notify.current?.(null);
  }, [controlled, ready, selected, categories]);

  const setPinned = (next: string | null | ((current: string | null) => string | null)) => {
    const value = typeof next === 'function' ? next(pinnedRef.current) : next;
    if (!controlled) setOwn(value);
    if (value !== pinnedRef.current) notify.current?.(value);
  };
  return [pinned, setPinned] as const;
}
