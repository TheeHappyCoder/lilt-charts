'use client';

import { useEffect, useState } from 'react';
import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { VISUALLY_HIDDEN } from '../text/text-kit';
import { createCountdown, remaining, type CountdownOptions } from './countdown';

/** Reads the time left in words, for screen readers. */
function spoken(ms: number, done: string) {
  const left = remaining(ms);
  if (left.total === 0) return done;
  const part = (n: string, unit: string) =>
    Number(n) ? `${Number(n)} ${unit}${Number(n) === 1 ? '' : 's'}` : '';
  return (
    [part(left.days, 'day'), part(left.hours, 'hour'), part(left.minutes, 'minute')]
      .filter(Boolean)
      .join(', ') || 'Under a minute'
  );
}

/**
 * A countdown in big type built from glyphs: digits fall out and scramble in as they change, and
 * at zero they burst and the done text sweeps in. Screen readers get the time left in words,
 * updated each minute.
 */
export function AsciiCountdown(props: SceneProps<CountdownOptions>) {
  // A fixed target, so the scene and the words count to the same moment even without `to`.
  const [fallback] = useState(() => Date.now() + 3600_000);
  const target = props.to ?? fallback;
  const parsed = typeof target === 'number' ? target : Date.parse(target);
  const [words, setWords] = useState('');
  useEffect(() => {
    const update = () => setWords(spoken(parsed - Date.now(), props.done ?? 'LIVE'));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, [parsed, props.done]);
  const canvas = useSceneProps<CountdownOptions>({ ...props, to: target }, createCountdown);
  return (
    <div role="timer" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <span style={VISUALLY_HIDDEN}>{words}</span>
      <AsciiCanvas {...canvas} />
    </div>
  );
}
