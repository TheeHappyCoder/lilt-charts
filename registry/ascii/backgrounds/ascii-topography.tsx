'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createTopography, type TopographyOptions } from './topography';

export type AsciiTopographyProps = SceneProps<TopographyOptions>;

/** Drifting contour lines, like a topographic map; the pointer raises a hill under it. */
export function AsciiTopography(props: AsciiTopographyProps) {
  return <AsciiCanvas {...useSceneProps(props, createTopography)} />;
}
