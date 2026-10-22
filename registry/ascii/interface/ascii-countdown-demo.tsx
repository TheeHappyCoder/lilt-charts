'use client';

import { useMemo } from 'react';
import type { SceneProps } from '../react/ascii-canvas';
import { AsciiCountdown } from './ascii-countdown';
import type { CountdownOptions } from './countdown';

/** A countdown that starts a set time from now, so the stage can show the finish too. */
export function AsciiCountdownDemo({
  from = 'days',
  ...props
}: SceneProps<CountdownOptions> & { from?: 'days' | 'seconds' }) {
  const to = useMemo(
    () => Date.now() + (from === 'seconds' ? 8_000 : ((2 * 24 + 7) * 3600 + 23 * 60 + 41) * 1000),
    [from],
  );
  return <AsciiCountdown {...props} to={to} />;
}
