'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createLogo, type LogoOptions } from './logo';

export type AsciiLogoProps = SceneProps<LogoOptions>;

/**
 * A word set in big type, drawn as lit slabs of colour, for the top of a page. The pointer knocks
 * cells loose and a click sends a shockwave. Pass `label` (usually the word) so screen readers
 * hear it; without one the canvas is decorative.
 */
export function AsciiLogo(props: AsciiLogoProps) {
  return <AsciiCanvas {...useSceneProps(props, createLogo)} />;
}
