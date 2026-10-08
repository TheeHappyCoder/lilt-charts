'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import { ChartPlot } from '../../chart-plot';
import { XAxis } from '../../primitives/axes';
import { Chart } from '../../runtime/chart-runtime';
import type { CardPaneContext } from '../../cards/cartesian-card';
import type { ChartBars, ChartSeries, ChartYConfig } from '../../types';

export interface PaneProps<Row> {
  context: CardPaneContext<Row>;
  /** Names the pane for screen readers and in its corner label. */
  label: string;
  /** Short text in the pane's top-left corner, e.g. "RSI 14". */
  caption?: ReactNode;
  /** Values beside the caption for the hovered row, or the latest row at rest. */
  readout?: (row: Row) => ReactNode;
  series: readonly ChartSeries<Row>[];
  height: number;
  y?: ChartYConfig;
  bars?: ChartBars;
  /** Label the x axis under this pane; only the lowest pane should. */
  xAxis?: boolean;
  children: ReactNode;
}

/**
 * A plot under a card's main plot, sharing its data, x, margins, and crosshair, so hover in any
 * pane reads the same observation in all of them.
 */
export function Pane<Row>({
  context,
  label,
  caption,
  readout,
  series,
  height,
  y,
  bars,
  xAxis = false,
  children,
}: PaneProps<Row>): ReactElement {
  const [hovered, setHovered] = useState<Row | null>(null);
  const shown = hovered ?? context.data.at(-1) ?? null;
  return (
    <div className="lilt-card__pane">
      {caption ? (
        <span className="lilt-card__pane-caption" aria-hidden="true">
          <span className="lilt-card__pane-name">{caption}</span>
          {readout && shown && !context.loading ? readout(shown) : null}
        </span>
      ) : null}
      <Chart
        className="lilt-card__chart"
        aria-label={label}
        data={context.data}
        x={context.x}
        y={y}
        series={series}
        controller={context.controller}
        onSelectionChange={readout ? (selection) => setHovered(selection?.row ?? null) : undefined}
        motion={context.motion}
        status={context.loading ? 'loading' : 'ready'}
        loadingStyle={context.loadingStyle}
      >
        <ChartPlot
          height={height}
          margins={{ ...context.margins, top: 6, bottom: xAxis ? 28 : 4 }}
          axis={context.axis}
          pill={context.hoverStyle}
          axisInset={context.axisInset}
          slots={context.slots || Boolean(bars)}
          bars={bars}
          background="none"
        >
          {children}
          {xAxis ? <XAxis labels="fit" /> : null}
        </ChartPlot>
      </Chart>
    </div>
  );
}
