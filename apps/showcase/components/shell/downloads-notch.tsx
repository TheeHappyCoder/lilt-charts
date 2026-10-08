'use client';

import { useRef } from 'react';
import {
  Area,
  Chart,
  ChartPlot,
  Line,
  useCartesianChartModel,
  type ChartSeries,
  type TimeXConfig,
} from '@lilt-ui/charts';
import { TooltipHint } from '@/components/ui/tooltip';
import { GitHubStars } from '@/components/github-stars';
import type { GitHubStars as Stars } from '@/lib/github-stars';
import type { DownloadDay, Downloads } from '@/lib/npm-downloads';
import { swellTo } from './swell';
import { useHairline, useSheetEdge } from './use-hairline';

// A swell poured up from the frame's bottom edge, in the style notch's language: one long curve
// out of the strip, a flat run holding the readout, and the same curve back.
const STRIP = 8;
const DEPTH = 40;
const TAPER = 52;

/**
 * Leaves and rejoins the sheet on its border's measured centre line, easing out with no bend.
 * `centre` is that line's depth from the frame's bottom edge.
 */
function swellPath(closed: boolean, centre: number, body: number) {
  const edge = DEPTH - centre;
  const end = TAPER + body;
  const width = TAPER * 2 + body;
  return [
    closed ? `M 0 ${DEPTH} V ${edge}` : `M 0 ${edge}`,
    swellTo([0, edge], [TAPER, 0], 'x'),
    `H ${end}`,
    swellTo([end, 0], [width, edge], 'x'),
    closed ? `V ${DEPTH} Z` : '',
  ].join(' ');
}

const SPARK_W = 44;
const SPARK_H = 18;
const series = [
  {
    id: 'total',
    label: 'npm downloads',
    accessor: (row: DownloadDay) => row.total,
    color: 'var(--brand-primary, #8b6dff)',
    curve: 'monotone',
    line: { width: 1.5 },
    area: { treatment: 'fade' },
  },
] as const satisfies readonly ChartSeries<DownloadDay>[];
const x = {
  type: 'time',
  accessor: (row: DownloadDay) => new Date(`${row.day}T00:00:00Z`),
} as const satisfies TimeXConfig<DownloadDay>;

/** The running total since launch, drawn by Lilt's own Area chart at sparkline size. */
function Spark({ days }: { days: readonly DownloadDay[] }) {
  const model = useCartesianChartModel({ data: days, x, series });
  return (
    <div className="lilt-downloads-notch__spark" style={{ width: SPARK_W }} aria-hidden="true">
      <Chart model={model} aria-label="npm downloads since launch" interactive={false}>
        <ChartPlot
          model={model}
          height={SPARK_H}
          margins={{ top: 2, right: 0, bottom: 0, left: 0 }}
          compact
          axis="minimal"
          background="none"
          pill={false}
          spotlight={false}
        >
          <Area model={model} series="total" />
          <Line model={model} series="total" />
        </ChartPlot>
      </Chart>
    </div>
  );
}

const count = new Intl.NumberFormat('en-US');
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Lilt's public package and repository, in the frame's bottom-right corner. */
export function DownloadsNotch({
  downloads,
  stars,
}: {
  downloads: Downloads | null;
  stars: Stars | null;
}) {
  const hairline = useHairline();
  const shapeRef = useRef<SVGSVGElement>(null);
  const sheet = useSheetEdge(shapeRef, 'bottom', {
    centre: STRIP + hairline / 2,
    inner: STRIP + hairline,
  });
  const since = downloads ? day.format(new Date(`${downloads.since}T00:00:00Z`)) : null;
  const body = downloads ? 256 : 112;
  const width = TAPER * 2 + body;
  return (
    <div className="lilt-downloads-notch" style={{ width, height: DEPTH }}>
      <svg
        ref={shapeRef}
        className="lilt-downloads-notch__shape"
        width={width}
        height={DEPTH}
        aria-hidden="true"
        focusable="false"
      >
        <path className="lilt-style-notch__fill" d={swellPath(true, sheet.centre, body)} />
        {/* Covers the sheet's own border across the notch, so its outline is the only line. */}
        <rect
          className="lilt-style-notch__fill"
          x={0}
          y={DEPTH - sheet.inner}
          width={width}
          height={sheet.inner}
        />
        <path
          className="lilt-style-notch__stroke"
          d={swellPath(false, sheet.centre, body)}
          style={{ strokeWidth: hairline }}
        />
      </svg>
      <div
        className="lilt-downloads-notch__content"
        style={{ left: TAPER - 6, right: TAPER - 6, height: DEPTH }}
      >
        {downloads ? (
          <>
            <TooltipHint content={`npm downloads since ${since}`} side="top">
              <a
                className="lilt-downloads-notch__link"
                href="https://www.npmjs.com/package/@lilt-ui/charts"
                target="_blank"
                rel="noreferrer"
                aria-label={`${count.format(downloads.total)} npm downloads since ${since}, on npm`}
              >
                <Spark days={downloads.days} />
                <span className="lilt-downloads-notch__total">{count.format(downloads.total)}</span>
                <span className="lilt-downloads-notch__label">npm</span>
              </a>
            </TooltipHint>
            <span className="lilt-downloads-notch__divider" aria-hidden="true" />
          </>
        ) : null}
        <GitHubStars stars={stars} />
      </div>
    </div>
  );
}
