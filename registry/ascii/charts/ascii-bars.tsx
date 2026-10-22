'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { chartLabel } from './chart-kit';
import { createBars, type BarsOptions } from './bars';

/** A bar chart drawn in type: bars that grow in turn, and a value on hover. */
export function AsciiBars(props: SceneProps<BarsOptions>) {
  const label = props.label ?? chartLabel('Bar chart', props.data, props.labels);
  return <AsciiCanvas {...useSceneProps({ ...props, label }, createBars)} />;
}
