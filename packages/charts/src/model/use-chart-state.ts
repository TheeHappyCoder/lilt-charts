import { useCallback, useRef, useSyncExternalStore } from 'react';

export interface ChartStateSource<Snapshot> {
  getSnapshot: () => Snapshot;
  subscribe: (listener: () => void) => () => void;
}

/** Subscribe to one model slice without changing the type carried by its handle. */
export function useChartState<Snapshot, Selected>(
  model: ChartStateSource<Snapshot>,
  selector: (snapshot: Snapshot) => Selected,
): Selected {
  const cache = useRef<{
    model: ChartStateSource<Snapshot>;
    selector: typeof selector;
    snapshot: Snapshot;
    selected: Selected;
  } | null>(null);
  const getSelected = useCallback(() => {
    const snapshot = model.getSnapshot();
    const previous = cache.current;
    if (previous?.model === model && previous.selector === selector) {
      if (Object.is(previous.snapshot, snapshot)) return previous.selected;
      const next = selector(snapshot);
      if (Object.is(previous.selected, next)) {
        cache.current = { ...previous, snapshot };
        return previous.selected;
      }
      cache.current = { model, selector, snapshot, selected: next };
      return next;
    }
    const selected = selector(snapshot);
    cache.current = { model, selector, snapshot, selected };
    return selected;
  }, [model, selector]);
  return useSyncExternalStore(model.subscribe, getSelected, getSelected);
}
