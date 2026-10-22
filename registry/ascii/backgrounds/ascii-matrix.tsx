'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createMatrix, type MatrixOptions } from './matrix';

export type AsciiMatrixProps = SceneProps<MatrixOptions>;

/** Slow, sparse digital rain in brand colours that parts around the pointer. */
export function AsciiMatrix(props: AsciiMatrixProps) {
  return <AsciiCanvas {...useSceneProps(props, createMatrix)} />;
}
