'use client';

import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { SkeletonSheen, SKELETON_INK } from '../lifecycle/skeleton-sheen';
import {
  Fragment,
  useId,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { m as animated } from 'motion/react';
import { AnimatedNumber, type AnimatedNumberVariant } from '../motion/animated-number';
import { REVEAL_EASE, useReducedMotion } from '../motion/use-chart-motion';
import type {
  ChartLoadingStyle,
  ChartMotion,
  ChartPalette,
  ChartStyle,
  ChartSurface,
} from '../types';
import {
  ChartCard,
  ChartCardDelta,
  ChartCardHeader,
  ChartCardRange,
  ChartCardTitle,
  ChartCardValue,
} from './chart-card';
import { useCardFormat } from './format';
import { DropShadow, shade, tubeLayers } from '../primitives/depth-paint';

export interface ProgressRange {
  id: string;
  label: string;
  value: number | null;
  /** Defaults to the card's `target`. */
  target?: number;
  delta?: number;
}

export interface ProgressCardProps {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** The measured amount. `null` shows a dash and an empty track, never zero. */
  value?: number | null;
  /** The goal, in the same unit as the value. */
  target: number;
  /** Words under the percentage. Defaults to "of goal". */
  label?: string;
  /**
   * `ring` (default) is a thin full ring, `thick` a heavy ring around a soft disc, and `gauge`
   * a half ring that opens downward.
   */
  variant?: 'ring' | 'thick' | 'gauge';
  /**
   * Gives the ring depth: the fill is lit as a tube and the track becomes a groove. The arc keeps
   * its exact angle.
   */
  depth?: boolean;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Last 7 days". */
  range?: string;
  /** Period select. Each range brings its own value, and optionally its own target and delta. */
  ranges?: readonly ProgressRange[];
  defaultRange?: string;
  /** Content below the ring, e.g. a note on how the goal was set. */
  footer?: ReactNode;
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  /** Any CSS color for the progress. Defaults to the palette's first color. */
  color?: string;
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  palette?: ChartPalette;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;
const FILL = 'var(--lilt-series-1)';
/** One stroke of a band drawn in layers. */
interface Layer {
  width: number;
  transform: string;
  stroke: string;
}
/** Grooves are shaded from the track's color, so it needs an opaque color rather than a tint. */
const SOLID_TRACK = 'color-mix(in oklab, var(--lilt-muted) 14%, var(--lilt-surface))';

/**
 * One value against a goal: the value in the header, and a large ring or gauge with the
 * percentage reached. Past the goal the ring stays full and the percentage keeps counting.
 */
export function ProgressCard({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Progress',
  value: suppliedValue = null,
  target: suppliedTarget,
  label = 'of goal',
  variant = 'ring',
  depth = false,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  footer,
  valueFormat,
  locale,
  formatValue,
  color,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  loading = false,
  loadingStyle = 'shimmer',
  motion: motionMode = 'auto',
  className,
  style,
}: ProgressCardProps): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const depthId = `lilt-progress-depth-${useId().replace(/:/g, '')}`;
  const format = useCardFormat({ valueFormat, locale, formatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const value = activeRange ? activeRange.value : suppliedValue;
  const target = activeRange?.target ?? suppliedTarget;
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const ratio = loading || value === null || !(target > 0) ? null : Math.max(0, value / target);

  const gauge = variant === 'gauge';
  const thick = variant === 'thick';
  const stroke = thick ? 26 : 10;
  const radius = 90 - stroke / 2;
  const track = gauge
    ? `M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`
    : undefined;

  // One track and one fill shape, drawn flat or as the stacked layers of a lit band.
  const trackShape = (layer?: Layer, skeleton = false) =>
    gauge ? (
      <path
        className="lilt-progress__track"
        data-loading={skeleton || undefined}
        d={track}
        strokeWidth={layer?.width ?? stroke}
        transform={layer?.transform}
        style={layer ? { stroke: layer.stroke } : undefined}
      />
    ) : (
      <circle
        className="lilt-progress__track"
        data-loading={skeleton || undefined}
        cx={100}
        cy={100}
        r={radius}
        strokeWidth={layer?.width ?? stroke}
        transform={layer?.transform}
        style={layer ? { stroke: layer.stroke } : undefined}
      />
    );
  // The fill lands on Lilt's spring, first draw and period changes alike, and its first draw
  // clears a soft blur.
  const fillMotion = {
    initial: reduced ? false : { pathLength: 0, filter: 'blur(4px)' },
    animate: { pathLength: Math.min(1, ratio ?? 0), filter: 'blur(0px)' },
    transition: reduced
      ? { duration: 0 }
      : {
          pathLength: { type: 'spring', duration: 0.9, bounce: 0.18 },
          filter: { duration: 0.5, ease: REVEAL_EASE },
        },
  } as const;
  const fillShape = (layer?: Layer) =>
    gauge ? (
      <animated.path
        className="lilt-progress__fill"
        d={track}
        strokeWidth={layer?.width ?? stroke}
        transform={layer?.transform}
        style={layer ? { stroke: layer.stroke } : undefined}
        {...fillMotion}
      />
    ) : (
      <animated.circle
        className="lilt-progress__fill"
        cx={100}
        cy={100}
        r={radius}
        strokeWidth={layer?.width ?? stroke}
        transform={`${layer?.transform ?? ''} rotate(-90 100 100)`.trim()}
        style={layer ? { stroke: layer.stroke } : undefined}
        {...fillMotion}
      />
    );

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-progress', className].filter(Boolean).join(' ')}
      style={color ? ({ ...style, '--lilt-series-1': color } as ChartStyle) : style}
      aria-label={ariaLabel}
      surface={surface}
      badge={badge}
      numberStyle={numberStyle}
      palette={palette}
    >
      {header ? (
        <ChartCardHeader
          aside={
            ranges || range ? (
              <ChartCardRange
                label={range}
                options={ranges?.map(({ id, label: text }) => ({ id, label: text }))}
                value={activeRange?.id}
                onValueChange={setRangeId}
              />
            ) : null
          }
        >
          {title ? <ChartCardTitle>{title}</ChartCardTitle> : null}
          <ChartCardValue value={value} format={format.value} loading={loading} motion={motionMode}>
            {loading || delta === undefined ? null : (
              <ChartCardDelta value={delta} tone={deltaTone} />
            )}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      <div
        className="lilt-progress__graphic"
        data-variant={variant}
        role="meter"
        aria-label={`${ratio === null ? 'No data' : percent(ratio)} ${label}, target ${format.value(target)}`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value ?? 0}
      >
        <svg aria-hidden="true" viewBox={gauge ? '0 0 200 106' : '0 0 200 200'}>
          {thick ? (
            <circle className="lilt-progress__disc" cx={100} cy={100} r={radius - 20} />
          ) : null}
          {/* The track's skeleton freezes and sinks into the middle before the fill sweeps in. */}
          <SkeletonExit leaving={skeletonLeaving} origin="center">
            <g>
              {loading ? (
                <SkeletonSheen
                  width={200}
                  height={gauge ? 106 : 200}
                  reduced={reduced}
                  loadingStyle={loadingStyle}
                  depth={depth}
                  mask={trackShape(undefined, true)}
                  sweep={
                    gauge ? (
                      <path
                        className="lilt-skeleton__sweep"
                        d={track}
                        fill="none"
                        stroke="white"
                        strokeWidth={stroke + 12}
                        pathLength={1}
                        strokeDasharray="1"
                      />
                    ) : (
                      <circle
                        className="lilt-skeleton__sweep"
                        cx={100}
                        cy={100}
                        r={radius}
                        fill="none"
                        stroke="white"
                        strokeWidth={stroke + 12}
                        pathLength={1}
                        strokeDasharray="1"
                        transform="rotate(-90 100 100)"
                      />
                    )
                  }
                >
                  {depth
                    ? tubeLayers(stroke).map((layer, index) => (
                        <Fragment key={index}>
                          {trackShape(
                            {
                              width: layer.strokeWidth,
                              transform: layer.transform,
                              stroke: shade(SKELETON_INK, layer.amount),
                            },
                            true,
                          )}
                        </Fragment>
                      ))
                    : trackShape(undefined, true)}
                </SkeletonSheen>
              ) : depth ? (
                // The track is a groove cut into the card; the fill is a lit tube lifted off it.
                <>
                  <defs>
                    <DropShadow id={`${depthId}-shadow`} size={5} />
                  </defs>
                  {tubeLayers(stroke, 'groove').map((layer, index) => (
                    <Fragment key={`track-${index}`}>
                      {trackShape({
                        width: layer.strokeWidth,
                        transform: layer.transform,
                        stroke: shade(SOLID_TRACK, layer.amount),
                      })}
                    </Fragment>
                  ))}
                  {ratio ? (
                    <g filter={`url(#${depthId}-shadow)`}>
                      {tubeLayers(stroke).map((layer, index) => (
                        <Fragment key={`fill-${index}`}>
                          {fillShape({
                            width: layer.strokeWidth,
                            transform: layer.transform,
                            stroke: shade(FILL, layer.amount),
                          })}
                        </Fragment>
                      ))}
                    </g>
                  ) : null}
                </>
              ) : (
                <>
                  {trackShape()}
                  {ratio ? fillShape() : null}
                </>
              )}
            </g>
          </SkeletonExit>
        </svg>
        <div className="lilt-progress__center" aria-hidden="true">
          <strong>
            {ratio === null ? (
              '—'
            ) : (
              <AnimatedNumber
                value={ratio}
                format={percent}
                variant={numberStyle}
                motion={reduced ? 'none' : 'auto'}
              />
            )}
          </strong>
          <span>{label}</span>
        </div>
      </div>
      {footer ? <div className="lilt-progress__footer">{footer}</div> : null}
    </ChartCard>
  );
}
