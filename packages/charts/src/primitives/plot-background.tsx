import { m } from 'motion/react';
import { useId, type ReactElement } from 'react';
import { useChartContext } from '../chart-context';
import { useAxisCursor } from '../interaction/axis-cursor';
import { entranceProgress } from '../motion/entrance';
import type { ChartBackground } from '../types';

const SPACING = { dots: 12, grid: 16, lines: 20 } as const;
const SPOTLIGHT_RADIUS = 110;

/**
 * Texture behind the plot marks. It fades toward the plot edges so it reads as depth rather than
 * graph paper, and optionally brightens around the inspected point.
 */
export function PlotBackground({
  kind,
  spotlight = true,
}: {
  kind: Exclude<ChartBackground, 'none'>;
  spotlight?: boolean;
}): ReactElement {
  const id = `lilt-bg-${useId().replaceAll(':', '')}`;
  const { snapshot, revealProgress, transitionDuration, reducedMotion } =
    useChartContext<unknown>();
  const cursor = useAxisCursor();
  const { left, top, width, height } = snapshot.plot;
  const spacing = SPACING[kind];
  const opacity =
    revealProgress < 1 && !reducedMotion
      ? entranceProgress(revealProgress * transitionDuration, 0, 320)
      : 1;
  const texture = (tone: 'base' | 'spot') => (
    <g className={`lilt-chart__texture-${tone}`}>
      {kind === 'dots' ? (
        <circle cx={spacing / 2} cy={spacing / 2} r={0.8} />
      ) : kind === 'grid' ? (
        <path d={`M ${spacing - 0.5} 0 V ${spacing} M 0 ${spacing - 0.5} H ${spacing}`} />
      ) : (
        <path d={`M 0 ${spacing - 0.5} H ${spacing}`} />
      )}
    </g>
  );
  const pattern = (tone: 'base' | 'spot') => (
    // Anchored to the plot's top-left so the texture never shifts with the marks.
    <pattern
      id={`${id}-${tone}`}
      width={spacing}
      height={spacing}
      patternUnits="userSpaceOnUse"
      x={left}
      y={top}
    >
      {texture(tone)}
    </pattern>
  );

  return (
    <g aria-hidden="true" className="lilt-chart__background" data-kind={kind} opacity={opacity}>
      <defs>
        {pattern('base')}
        {spotlight ? pattern('spot') : null}
        <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="72%">
          <stop offset="0" stopColor="white" />
          <stop offset="0.55" stopColor="white" stopOpacity={0.75} />
          <stop offset="1" stopColor="white" stopOpacity={0} />
        </radialGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse">
          <rect x={left} y={top} width={width} height={height} fill={`url(#${id}-fade)`} />
        </mask>
        {spotlight ? (
          <>
            <radialGradient id={`${id}-spot-fade`}>
              <stop offset="0" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity={0} />
            </radialGradient>
            <mask id={`${id}-spot-mask`} maskUnits="userSpaceOnUse">
              <m.ellipse
                cx={cursor.pointerX}
                cy={cursor.y}
                rx={SPOTLIGHT_RADIUS}
                ry={SPOTLIGHT_RADIUS}
                fill={`url(#${id}-spot-fade)`}
              />
            </mask>
          </>
        ) : null}
      </defs>
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        fill={`url(#${id}-base)`}
        mask={`url(#${id}-mask)`}
      />
      {spotlight ? (
        <m.g style={{ opacity: cursor.active }}>
          <rect
            x={left}
            y={top}
            width={width}
            height={height}
            fill={`url(#${id}-spot)`}
            mask={`url(#${id}-spot-mask)`}
          />
        </m.g>
      ) : null}
    </g>
  );
}
