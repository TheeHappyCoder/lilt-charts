import { m } from 'motion/react';
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { TooltipProps } from '../types';
import type { CartesianChartModel } from '../model/cartesian-model';
import { useChartRuntime } from '../runtime/chart-runtime';
import { ComparisonTooltip } from './comparison-tooltip';
import { AdaptiveReadout } from './adaptive-readout';
import { useTooltipView } from './tooltip-view';
import { FieldList } from './field-values';

/** A real, optional HTML part in ChartPlot's tooltip slot. */
export function Tooltip<Row, Id extends string>(
  props: TooltipProps<Row, Id> & { model: CartesianChartModel<Row, Id> },
): ReactElement | null;
export function Tooltip(props?: TooltipProps & { model?: never }): ReactElement | null;
export function Tooltip(
  props: TooltipProps & { model?: CartesianChartModel<unknown, string> } = {},
): ReactElement | null {
  const view = useTooltipView();
  const runtime = useChartRuntime();
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripWidth, setStripWidth] = useState(0);
  const customRef = useRef<HTMLDivElement>(null);
  const [customHeight, setCustomHeight] = useState(0);
  // The strip centers on the crosshair, so it measures itself as its text changes. Custom
  // content is measured too, so `density="auto"` knows how tall the panel will be.
  useLayoutEffect(() => {
    const element = stripRef.current;
    if (element && element.offsetWidth !== stripWidth) setStripWidth(element.offsetWidth);
    const custom = customRef.current?.offsetHeight ?? 0;
    if (custom !== customHeight) setCustomHeight(custom);
  });
  if (props.model && props.model !== runtime.model)
    throw new Error('Lilt Tooltip model must be the model supplied to its Chart.');
  if (props.floating === false) return null;
  if (view.comparison) {
    return props.renderComparison ? (
      <ComparisonTooltip
        comparison={view.comparison}
        renderContent={props.renderComparison}
        startX={view.compareStartX}
        endX={view.compareEndX}
        top={view.top}
        width={view.width}
        height={view.height}
        className={props.className}
        ariaLabel={props['aria-label']}
      />
    ) : null;
  }
  if (props.adaptive !== false && !view.compact && (view.narrow || view.peer))
    return view.adaptive ? (
      <AdaptiveReadout {...view.adaptive} renderContent={props.renderContent} />
    ) : null;
  const reading = view.inspection;
  if (!reading) return null;
  const panelWidth = Math.min(236, Math.max(160, view.width - 16));
  const left =
    view.x + panelWidth + 16 <= view.width - 8
      ? view.x + 16
      : Math.max(8, view.x - panelWidth - 16);
  // Pinned to the top of the chart, beside the crosshair, so it reads above the marks.
  const top = Math.max(0, Math.min(8, view.height - 160));
  // The panel never runs past the plot: it turns compact first, then scrolls as a last resort.
  const room = Math.max(48, view.height - top - 4);
  const fieldRows = reading.series.reduce((sum, item) => sum + (item.fields.length ? 1 : 0), 0);
  const comfortableHeight =
    50 +
    (props.renderContent ? customHeight + 15 : reading.series.length * 24 + fieldRows * 14) +
    (reading.pinned ? 47 : 0) +
    (view.keyboardHint ? 56 : 0);
  const density =
    props.density && props.density !== 'auto'
      ? props.density
      : comfortableHeight > room
        ? 'compact'
        : 'comfortable';
  const compactPanel = density === 'compact';
  // One series leads when the pointer or keyboard points at it; accent panels take its color.
  const active = reading.series.length > 1 ? reading.activeSeriesId : undefined;
  const lead = active ?? reading.series[0]?.id;
  const glide = view.reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 520, damping: 42, mass: 0.6 };
  const color = (id: string) => view.colors[id] ?? 'var(--lilt-series-1)';

  if (props.layout === 'strip') {
    // One line in the room above the plot, centered on the crosshair and kept inside the chart.
    const stripLeft = Math.min(
      Math.max(8, view.x - stripWidth / 2),
      Math.max(8, view.width - stripWidth - 8),
    );
    const stripTop = Math.max(0, view.top - 38);
    return (
      <m.div
        ref={stripRef}
        aria-label={props['aria-label'] ?? `Values for ${reading.formattedX}`}
        className={['lilt-chart__tooltip', 'lilt-chart__strip', props.className]
          .filter(Boolean)
          .join(' ')}
        data-layout="strip"
        data-pinned={reading.pinned || undefined}
        data-variant={props.variant ?? 'soft'}
        data-indicator={props.indicator ?? 'square'}
        inert={!reading.pinned}
        initial={{ opacity: 0, left: stripLeft, top: stripTop }}
        animate={{ opacity: stripWidth ? 1 : 0, left: stripLeft, top: stripTop }}
        transition={{
          opacity: { duration: view.reducedMotion ? 0 : 0.15 },
          left: glide,
          top: { duration: 0 },
        }}
        style={
          {
            maxWidth: Math.max(1, view.width - 16),
            '--lilt-tooltip-series': (lead && color(lead)) ?? 'var(--lilt-series-1)',
          } as CSSProperties
        }
      >
        <div className="lilt-chart__tooltip-panel">
          <span className="lilt-chart__strip-title">{reading.formattedX}</span>
          {props.renderContent ? (
            <span className="lilt-chart__tooltip-custom">{props.renderContent(reading)}</span>
          ) : (
            reading.series.map((series) => (
              <span
                className="lilt-chart__strip-item"
                data-active={(active && series.id === active) || undefined}
                data-muted={(active && series.id !== active) || undefined}
                key={series.id}
              >
                <span
                  className="lilt-chart__tooltip-swatch"
                  aria-hidden="true"
                  style={{ backgroundColor: color(series.id) }}
                />
                <strong>{series.formattedValue}</strong>
                <span className="lilt-chart__tooltip-label">{series.label}</span>
              </span>
            ))
          )}
          {reading.pinned ? (
            <button type="button" className="lilt-chart__strip-release" onClick={view.onRelease}>
              Unpin
            </button>
          ) : null}
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      aria-label={props['aria-label'] ?? `Values for ${reading.formattedX}`}
      className={['lilt-chart__tooltip', props.className].filter(Boolean).join(' ')}
      data-pinned={reading.pinned || undefined}
      data-variant={props.variant ?? 'soft'}
      data-indicator={props.indicator ?? 'square'}
      data-adaptive={props.adaptive === false ? 'false' : undefined}
      data-density={density}
      data-keyboard-hint={view.keyboardHint ? '' : undefined}
      inert={!reading.pinned}
      initial={{ opacity: 0, left, top }}
      animate={{ opacity: 1, left, top }}
      transition={{
        opacity: { duration: view.reducedMotion ? 0 : 0.15 },
        left: glide,
        top: glide,
      }}
      style={
        {
          maxWidth: Math.max(1, view.width - 16),
          '--lilt-tooltip-series': (lead && view.colors[lead]) ?? 'var(--lilt-series-1)',
        } as CSSProperties
      }
    >
      <div className="lilt-chart__tooltip-panel" style={{ maxHeight: room }}>
        <div className="lilt-chart__tooltip-title">
          <span>{reading.formattedX}</span>
          {reading.pinned && compactPanel ? (
            <button type="button" className="lilt-chart__tooltip-release" onClick={view.onRelease}>
              Unpin
            </button>
          ) : reading.pinned ? (
            <span className="lilt-chart__tooltip-pin-status">
              <span aria-hidden="true" className="lilt-chart__tooltip-pin-icon">
                {props.pinIcon ?? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5ZM12 13v8"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    />
                  </svg>
                )}
              </span>
              Pinned
            </span>
          ) : null}
        </div>
        {props.renderContent ? (
          <div className="lilt-chart__tooltip-custom" ref={customRef}>
            {props.renderContent(reading)}
          </div>
        ) : (
          <div className="lilt-chart__tooltip-rows">
            {reading.series.map((series) => (
              <div
                className="lilt-chart__tooltip-row"
                data-active={(active && series.id === active) || undefined}
                data-muted={(active && series.id !== active) || undefined}
                key={series.id}
              >
                <span
                  className="lilt-chart__tooltip-swatch"
                  aria-hidden="true"
                  style={{ backgroundColor: view.colors[series.id] ?? 'var(--lilt-series-1)' }}
                />
                <span className="lilt-chart__tooltip-label">{series.label}</span>
                {series.status !== 'observed' ? (
                  <span className="lilt-chart__tooltip-status">{series.status}</span>
                ) : null}
                <strong>{series.formattedValue}</strong>
                {series.fields.length ? <FieldList fields={series.fields} /> : null}
              </div>
            ))}
          </div>
        )}
        {reading.pinned && !(compactPanel && !view.onCompareFromHere) ? (
          <div className="lilt-chart__tooltip-actions">
            {view.onCompareFromHere ? (
              <button type="button" onClick={view.onCompareFromHere}>
                Compare from here
              </button>
            ) : null}
            {compactPanel ? null : (
              <button type="button" onClick={view.onRelease}>
                Unpin
              </button>
            )}
          </div>
        ) : null}
        {view.keyboardHint ? <p className="lilt-chart__tooltip-hint">{view.keyboardHint}</p> : null}
      </div>
    </m.div>
  );
}
