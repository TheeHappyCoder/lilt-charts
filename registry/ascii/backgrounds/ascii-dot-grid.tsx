'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createDotGrid, type DotGridOptions } from './dot-grid';

export type AsciiDotGridProps = SceneProps<DotGridOptions>;

/** An even grid of dots that bulges around the pointer and rings out on click. */
export function AsciiDotGrid(props: AsciiDotGridProps) {
  return <AsciiCanvas {...useSceneProps(props, createDotGrid)} />;
}
