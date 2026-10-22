'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { AsciiStage } from '../engine/stage';
import type { AsciiScene } from '../engine/types';

export interface AsciiCanvasProps {
  /** Builds the scene. Called again only when `sceneKey` changes. */
  scene: () => AsciiScene;
  /** Changes when the scene should be rebuilt, such as a JSON string of its options. */
  sceneKey?: string;
  /** Font size of each cell in CSS pixels. Default 14. */
  cellSize?: number;
  /** Follow the pointer and answer clicks. Default true. */
  interactive?: boolean;
  /** How fast the scene's clock runs: 0.5 is half speed, 2 is double. Default 1. */
  speed?: number;
  /**
   * Describes the picture for screen readers. Without one the canvas is decorative and hidden
   * from assistive technology, which suits a background.
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A canvas that runs an ASCII scene. It fills its parent; give the parent a size. Set the type
 * with CSS `font-family` (a monospace face) and the ink with `color`.
 */
export function AsciiCanvas({
  scene,
  sceneKey,
  cellSize,
  interactive,
  speed,
  label,
  className,
  style,
}: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<AsciiStage | null>(null);
  const latest = useRef({ scene, cellSize, interactive, speed });
  latest.current = { scene, cellSize, interactive, speed };

  // A new scene starts a new world; everything else is tuned on the running stage.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { scene: build, ...options } = latest.current;
    const stage = new AsciiStage(canvas, build(), options);
    stageRef.current = stage;
    return () => {
      stage.destroy();
      stageRef.current = null;
    };
  }, [sceneKey]);

  useEffect(() => {
    stageRef.current?.configure({ cellSize, interactive, speed });
  }, [cellSize, interactive, speed]);

  const ink = style?.color;
  useEffect(() => {
    stageRef.current?.refresh();
  }, [ink]);

  return (
    <canvas
      ref={canvasRef}
      className={className ? `lilt-ascii ${className}` : 'lilt-ascii'}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  );
}

export type SceneProps<Options> = Options & Omit<AsciiCanvasProps, 'scene' | 'sceneKey'>;

/** Splits a scene's own options from the canvas props. */
export function useSceneProps<Options extends object>(
  props: SceneProps<Options>,
  create: (options: Options) => AsciiScene,
): AsciiCanvasProps {
  const { cellSize, interactive, speed, label, className, style, ...options } = props;
  return {
    scene: () => create(options as Options),
    sceneKey: JSON.stringify(options),
    cellSize,
    interactive,
    speed,
    label,
    className,
    style,
  };
}
