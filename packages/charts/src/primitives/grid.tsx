import { m } from 'motion/react';
import { useId, type ReactElement } from 'react';
import { useChartContext } from '../chart-context';
import type { GridProps } from '../types';
import { entranceProgress } from '../motion/entrance';
import { useAxisCursor } from '../interaction/axis-cursor';

const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

export function Grid({
  className,
  pattern = 'lines',
  color,
  opacity: markOpacity = 1,
  lineWidth,
  dotSpacing = 8,
  dotRadius = 0.6,
}: GridProps = {}): ReactElement {
  if (
    !Number.isFinite(markOpacity) ||
    markOpacity < 0 ||
    markOpacity > 1 ||
    (lineWidth !== undefined && (!Number.isFinite(lineWidth) || lineWidth < 0)) ||
    !Number.isFinite(dotSpacing) ||
    dotSpacing <= 0 ||
    !Number.isFinite(dotRadius) ||
    dotRadius < 0 ||
    dotRadius > dotSpacing / 2
  )
    throw new Error(
      'Lilt Grid requires opacity in [0, 1], non-negative lineWidth, positive dotSpacing, and dotRadius within half the spacing.',
    );
  const id = `lilt-grid-${useId().replaceAll(':', '')}`;
  const {
    snapshot,
    previousSnapshot,
    axis,
    transitionDuration,
    reducedMotion,
    gridGradientId,
    revealProgress,
  } = useChartContext<unknown>();
  // Grid lines run across the y axis, so they follow its preset.
  const axisStyle = useAxisCursor().axis.y;
  const revealing = revealProgress < 1;
  const opacity = entranceProgress(
    revealing ? revealProgress * transitionDuration : Infinity,
    0,
    240,
  );
  const duration = reducedMotion ? 0 : transitionDuration / 1000;
  const previousY = new Map(
    (previousSnapshot?.yTicks ?? []).map((value) => [value, previousSnapshot!.yToPixel(value)]),
  );

  if (pattern === 'dots')
    return (
      <g
        aria-hidden="true"
        className={['lilt-chart__grid-dots', className].filter(Boolean).join(' ')}
        opacity={opacity * markOpacity}
      >
        <defs>
          <pattern id={id} width={dotSpacing} height={dotSpacing} patternUnits="userSpaceOnUse">
            <circle
              cx={dotSpacing / 2}
              cy={dotSpacing / 2}
              r={dotRadius}
              fill={color ?? 'var(--lilt-grid-dot-color, var(--lilt-muted))'}
              opacity="var(--lilt-grid-dot-opacity, 0.16)"
              style={{
                fill: color ?? 'var(--lilt-grid-dot-color, var(--lilt-muted))',
                opacity: 'var(--lilt-grid-dot-opacity, 0.16)',
              }}
            />
          </pattern>
          <radialGradient id={`${id}-fade`} cx="50%" cy="45%" r="65%">
            <stop offset="0" stopColor="white" />
            <stop offset="0.6" stopColor="white" stopOpacity={0.6} />
            <stop offset="1" stopColor="white" stopOpacity={0} />
          </radialGradient>
          <mask id={`${id}-mask`}>
            <rect
              x={snapshot.plot.left}
              y={snapshot.plot.top}
              width={snapshot.plot.width}
              height={snapshot.plot.height}
              fill={`url(#${id}-fade)`}
            />
          </mask>
        </defs>
        <rect
          x={snapshot.plot.left}
          y={snapshot.plot.top}
          width={snapshot.plot.width}
          height={snapshot.plot.height}
          fill={`url(#${id})`}
          mask={`url(#${id}-mask)`}
        />
      </g>
    );

  // Minimal plots carry no grid, and segments stand in for it; inline and ruler axes use quieter
  // dashed hairlines.
  if (axisStyle === 'minimal' || axisStyle === 'dots' || axisStyle === 'segmented')
    return <g aria-hidden="true" className="lilt-chart__grid" />;
  const dashed = axisStyle === 'inline' || axisStyle === 'ruler';

  return (
    <g
      aria-hidden="true"
      className={['lilt-chart__grid', className].filter(Boolean).join(' ')}
      data-dashed={dashed || undefined}
      fill="none"
      opacity={opacity * markOpacity}
    >
      {axis.y.map((tick) => {
        const isCurrent = snapshot.yTicks.includes(tick.value);
        const targetY = isCurrent
          ? snapshot.yToPixel(tick.value)
          : (previousY.get(tick.value) ?? snapshot.plot.bottom);
        const initialY = previousY.get(tick.value) ?? targetY + 6;
        return (
          <m.line
            animate={{ opacity: isCurrent ? 1 : 0, y1: targetY, y2: targetY }}
            initial={
              revealing || reducedMotion || duration === 0
                ? false
                : { opacity: tick.entering ? 0 : 1, y1: initialY, y2: initialY }
            }
            key={`grid-${tick.value}`}
            stroke={color ?? `url(#${gridGradientId})`}
            style={{
              stroke: color ?? `url(#${gridGradientId})`,
              strokeWidth: lineWidth,
              strokeDasharray: dashed ? '2 4' : undefined,
            }}
            transition={{ duration: revealing ? 0 : duration, ease: REVEAL_EASE }}
            vectorEffect="non-scaling-stroke"
            x1={snapshot.plot.left}
            x2={snapshot.plot.right}
          />
        );
      })}
    </g>
  );
}
