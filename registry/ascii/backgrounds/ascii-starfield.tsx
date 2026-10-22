'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createStarfield, type StarfieldOptions } from './starfield';

export type AsciiStarfieldProps = SceneProps<StarfieldOptions>;

/** Stars streaming toward the viewer; the pointer steers and a click jumps to warp. */
export function AsciiStarfield(props: AsciiStarfieldProps) {
  return <AsciiCanvas {...useSceneProps(props, createStarfield)} />;
}
