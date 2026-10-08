import type {
  ChartController,
  ChartControllerInspection,
  ChartControllerSnapshot,
  ChartRange,
} from '../types';

const frozen = <T extends object>(value: T): Readonly<T> => Object.freeze({ ...value });

/**
 * Creates a tiny framework-agnostic interaction store. Reuse one instance to link charts,
 * or pass it to compact and expanded chart mounts to preserve the user's place.
 */
export function createChartController(): ChartController {
  let snapshot: ChartControllerSnapshot = frozen({
    inspection: null,
    comparison: null,
    focus: null,
  });
  const listeners = new Set<() => void>();
  let pendingInspection: ChartControllerInspection | null | undefined;
  let frame: number | null = null;

  const publish = (next: ChartControllerSnapshot) => {
    if (next === snapshot) return;
    snapshot = frozen(next);
    listeners.forEach((listener) => listener());
  };

  const flushInspection = () => {
    frame = null;
    if (pendingInspection === undefined) return;
    const inspection = pendingInspection;
    pendingInspection = undefined;
    const current = snapshot.inspection;
    if (
      current?.x === inspection?.x &&
      current?.pinned === inspection?.pinned &&
      current?.ownerId === inspection?.ownerId &&
      current?.local === inspection?.local &&
      current?.from === inspection?.from
    )
      return;
    publish({ ...snapshot, inspection });
  };

  const scheduleInspection = (inspection: ChartControllerInspection | null) => {
    pendingInspection = inspection ? frozen(inspection) : null;
    if (frame !== null) return;
    if (typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(flushInspection);
    } else {
      flushInspection();
    }
  };
  const cancelPending = () => {
    if (frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    frame = null;
    pendingInspection = undefined;
  };

  const sameRange = (a: ChartRange | null, b: ChartRange | null) =>
    a?.startX === b?.startX && a?.endX === b?.endX;

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    inspect: scheduleInspection,
    clearInspection(ownerId) {
      if (ownerId) {
        if (pendingInspection?.ownerId === ownerId) cancelPending();
        if (snapshot.inspection?.ownerId === ownerId) publish({ ...snapshot, inspection: null });
        return;
      }
      scheduleInspection(null);
    },
    releaseOwner(ownerId) {
      const pending = pendingInspection;
      if (pending?.ownerId === ownerId) {
        cancelPending();
        if (pending.pinned) {
          publish({ ...snapshot, inspection: pending });
          return;
        }
      }
      if (snapshot.inspection?.ownerId === ownerId && !snapshot.inspection.pinned)
        publish({ ...snapshot, inspection: null });
    },
    setComparison(comparison) {
      const current = snapshot.comparison;
      if (sameRange(current, comparison) && current?.series === comparison?.series) return;
      publish({ ...snapshot, comparison: comparison ? frozen(comparison) : null });
    },
    setFocus(focus) {
      if (sameRange(snapshot.focus, focus)) return;
      publish({ ...snapshot, focus: focus ? frozen(focus) : null });
    },
  };
}
