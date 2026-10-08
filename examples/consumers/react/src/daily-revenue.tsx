'use client';

import {
  Area,
  Chart,
  ChartPlot,
  Grid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  type ChartPalette,
  type ChartSeries,
} from '@lilt-ui/charts';
import '@lilt-ui/charts/styles.css';

type Day = { date: number; revenue: number; previous: number };
const rows: Day[] = [
  [1, 2180, 1950],
  [2, 2340, 2050],
  [3, 2110, 2020],
  [4, 2670, 2140],
  [5, 2510, 2220],
  [6, 2880, 2300],
  [7, 2750, 2250],
  [8, 3090, 2470],
  [9, 2870, 2390],
  [10, 3360, 2680],
  [11, 3190, 2760],
  [12, 3520, 2840],
  [13, 3440, 2920],
  [14, 3710, 3060],
].map(([day, revenue, previous]) => ({ date: Date.UTC(2026, 8, day), revenue, previous }));
export { rows as dailyRevenueRows };
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const shortMoney = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 1,
});
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const series: readonly ChartSeries<Day>[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    accessor: (row) => row.revenue,
    color: 'var(--lilt-series-1)',
    line: { width: 2.25 },
    area: { treatment: 'fade' },
    formatValue: money.format,
  },
  {
    id: 'previous',
    label: 'Previous period',
    accessor: (row) => row.previous,
    color: 'var(--lilt-reference)',
    line: { width: 1.5, dasharray: '4 4' },
    formatValue: money.format,
  },
];
const hatchSeries: readonly ChartSeries<Day>[] = [
  { ...series[0]!, area: { treatment: 'hatch' } },
  series[1]!,
];
const total = rows.reduce((sum, row) => sum + row.revenue, 0);
const previousTotal = rows.reduce((sum, row) => sum + row.previous, 0);
const change = (total / previousTotal - 1) * 100;

const chartDefaults = {
  palette: 'emerald',
  paint: 'fade',
  layout: 'roomy',
} as const;

export function DailyRevenue({
  palette = chartDefaults.palette,
  paint = chartDefaults.paint,
  layout = chartDefaults.layout,
}: {
  palette?: ChartPalette;
  paint?: 'fade' | 'hatch';
  layout?: 'roomy' | 'compact';
} = {}) {
  return (
    <section
      data-lilt-chart=""
      data-lilt-area=""
      data-lilt-palette={palette}
      aria-label="Daily revenue card"
      style={{
        padding: 0,
        border: '1px solid var(--lilt-border)',
        borderRadius: 12,
        background: 'var(--lilt-surface)',
        minWidth: 0,
        minHeight: layout === 'compact' ? 340 : 420,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 16,
      }}
    >
      <Chart
        aria-label="Daily revenue against the previous period"
        data={rows}
        series={paint === 'hatch' ? hatchSeries : series}
        style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}
        x={{ type: 'time', accessor: (row) => row.date, format: (value) => day.format(value) }}
        y={{ format: shortMoney.format, ticks: 4 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px 24px',
            padding:
              layout === 'compact'
                ? '16px 16px 20px'
                : 'clamp(16px, 3vw, 24px) clamp(16px, 3vw, 24px) 28px',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 180px' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 550 }}>Revenue</h2>
            <div
              style={{
                marginTop: 8,
                fontSize: 'clamp(32px, 5vw, 40px)',
                fontWeight: 550,
                lineHeight: 1.2,
                letterSpacing: '-.05em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {money.format(total)}
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--lilt-muted)', fontSize: 12 }}>
              <span
                style={{ color: change >= 0 ? 'var(--lilt-positive)' : 'var(--lilt-negative)' }}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>{' '}
              from previous period
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              justifyItems: 'end',
              gap: 24,
              minWidth: 0,
              maxWidth: '100%',
              marginLeft: 'auto',
            }}
          >
            <span
              style={{
                color: 'var(--lilt-muted)',
                fontSize: 12,
              }}
            >
              Sep 1–14, 2026
            </span>
            <Legend interactive />
          </div>
        </div>
        <ChartPlot height="fill" margins={{ top: 12, right: 0, bottom: 38, left: 0 }}>
          <Grid pattern="dots" />
          <Area series="revenue" />
          <Line series="revenue" />
          <Line series="previous" />
          <XAxis edgeInset={24} />
          <YAxis showTicks={false} />
          <Tooltip />
        </ChartPlot>
      </Chart>
    </section>
  );
}
