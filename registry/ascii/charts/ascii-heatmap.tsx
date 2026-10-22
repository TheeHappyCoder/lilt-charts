'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { chartLabel } from './chart-kit';
import { createHeatmap, type HeatmapOptions } from './heatmap';

/** A calendar heatmap drawn in type: a glyph a day, denser and brighter on busy days. */
export function AsciiHeatmap(props: SceneProps<HeatmapOptions>) {
  const label = props.label ?? chartLabel('Calendar heatmap, one value a day,', props.data);
  return <AsciiCanvas {...useSceneProps({ ...props, label }, createHeatmap)} />;
}
