import { useCallback, useRef, useState, type SetStateAction } from 'react';

/** User selection can be owned by a dashboard; hover remains local to the chart. */
export function usePinnedSelection(
  controlled: string | null | undefined,
  onChange?: (id: string | null) => void,
) {
  const [local, setLocal] = useState<string | null>(null);
  const selected = controlled === undefined ? local : controlled;
  const current = useRef({ selected, controlled, onChange });
  current.current = { selected, controlled, onChange };
  const setSelected = useCallback((next: SetStateAction<string | null>) => {
    const state = current.current;
    const value = typeof next === 'function' ? next(state.selected) : next;
    if (value === state.selected) return;
    if (state.controlled === undefined) setLocal(value);
    state.onChange?.(value);
  }, []);
  const reset = useCallback(() => setLocal(null), []);
  return [selected, setSelected, reset] as const;
}
