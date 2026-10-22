'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createClock, type ClockOptions } from './clock';

/** A clock or countdown in large digits of solid type that scramble as they change. */
export function AsciiClock(props: SceneProps<ClockOptions>) {
  const label = props.label ?? (props.mode === 'countdown' ? 'Countdown' : 'Clock');
  return <AsciiCanvas {...useSceneProps({ ...props, label }, createClock)} />;
}
