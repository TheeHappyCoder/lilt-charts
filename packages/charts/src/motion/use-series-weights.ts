import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'motion';
import { REVEAL_EASE } from './use-chart-motion';

/** One interruptible clock collapses all stack boundaries together. */
export function useSeriesWeights(
  ids: readonly string[],
  visible: readonly string[],
  enabled: boolean,
  reduced: boolean,
) {
  const key = JSON.stringify(ids.map((id) => [id, visible.includes(id) ? 1 : 0]));
  const target = useMemo(
    () => Object.fromEntries(JSON.parse(key)) as Record<string, number>,
    [key],
  );
  const [weights, setWeights] = useState<Record<string, number>>(target);
  const displayed = useRef(weights);
  useLayoutEffect(() => {
    const from = displayed.current;
    if (!enabled || reduced) {
      displayed.current = target;
      setWeights(target);
      return;
    }
    if (Object.entries(target).every(([id, value]) => from[id] === value)) return;
    const control = animate(0, 1, {
      duration: 0.42,
      ease: REVEAL_EASE,
      onUpdate: (progress) => {
        const next = Object.fromEntries(
          Object.entries(target).map(([id, value]) => [
            id,
            (from[id] ?? 0) + (value - (from[id] ?? 0)) * progress,
          ]),
        );
        displayed.current = next;
        setWeights(next);
      },
    });
    return () => control.stop();
  }, [target, enabled, reduced]);
  return reduced ? target : weights;
}
