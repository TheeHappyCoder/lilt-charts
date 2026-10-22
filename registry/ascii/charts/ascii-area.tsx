'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { chartLabel } from './chart-kit';
import { createArea, type AreaOptions } from './area';

/** An area chart drawn in type: the line, solid fill beneath, and a value on hover. */
export function AsciiArea(props: SceneProps<AreaOptions>) {
  const label = props.label ?? chartLabel('Area chart', props.data, props.labels);
  return <AsciiCanvas {...useSceneProps({ ...props, label }, createArea)} />;
}
