import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { buildSnapshot } from '../chart-context';
import { normalizeData } from '../engine/normalize';
import { AdaptiveReadout } from './adaptive-readout';
import { tooltipContext } from './tooltip-context';

it('keeps percent-axis units out of raw tooltip values and narrow stack totals', () => {
  const data = [{ x: 1, a: 403, b: 504, c: 213 }];
  const series = (['a', 'b', 'c'] as const).map((id) => ({
    id,
    label: id,
    accessor: (row: (typeof data)[number]) => row[id],
    formatValue: (value: number) => `$${value}`,
  }));
  const x = { type: 'number' as const, accessor: (row: (typeof data)[number]) => row.x };
  const snapshot = buildSnapshot(
    normalizeData(data, series, x),
    series,
    x,
    { format: (value) => `${value}%` },
    { left: 40, top: 12, right: 12, bottom: 30 },
    360,
    280,
    undefined,
    undefined,
    series,
    { bars: null, stack: { series: series.map((item) => item.id), mode: 'percent' } },
    undefined,
  );
  expect(snapshot.formatY(100)).toBe('100%');
  expect(snapshot.formatValue(1120)).toBe('$1120');
  // A custom tooltip and the built-in narrow readout must agree with the data.
  expect(
    tooltipContext(snapshot, snapshot.data.rows[0], series, true).series[0].formattedValue,
  ).toBe('$403');
  const html = renderToStaticMarkup(
    <AdaptiveReadout
      snapshot={snapshot}
      series={series}
      selection={null}
      peer={false}
      pinned={false}
      onRelease={() => {}}
      reducedMotion
    />,
  );
  expect(html).toContain('$1120');
  expect(html).not.toContain('1120%');
  const plain = series.map(({ formatValue: _format, ...item }) => item);
  const unformatted = buildSnapshot(
    normalizeData(data, plain, x),
    plain,
    x,
    {},
    { left: 40, top: 12, right: 12, bottom: 30 },
    360,
    280,
    undefined,
    undefined,
    plain,
    { bars: null, stack: { series: series.map((item) => item.id), mode: 'percent' } },
    undefined,
  );
  expect(
    tooltipContext(unformatted, unformatted.data.rows[0], plain, false).series[0].formattedValue,
  ).toBe('403');
});
