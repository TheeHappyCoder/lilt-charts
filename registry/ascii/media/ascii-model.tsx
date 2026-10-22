'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createModel, type ModelOptions } from './model';

export type AsciiModelProps = SceneProps<ModelOptions>;

/**
 * A 3D model drawn in type: a torus, cube, sphere, knot, icosahedron or a mesh of your own, lit
 * and solid. It turns on its own, leans toward the pointer, and spins faster when clicked.
 */
export function AsciiModel(props: AsciiModelProps) {
  return <AsciiCanvas {...useSceneProps(props, createModel)} />;
}
