import { describe, expect, it } from 'vitest';
import { computeYDomain } from './domains';
import { buildGeometry, pointAtX } from './geometry';
import { assertOrdered, bandPaths } from './ranges';
import { hasMatchingTopology, normalizeData } from './normalize';
import type { ChartSeries } from '../types';

interface Row {
  x: number;
  first: number | null;
  second?: number | null;
}

const series = [
  { id: 'first', label: 'First', accessor: (row: Row) => row.first, curve: 'linear' },
  { id: 'second', label: 'Second', accessor: (row: Row) => row.second ?? null },
] satisfies readonly ChartSeries<Row>[];

const x = { type: 'number', accessor: (row: Row) => row.x } as const;

describe('normalizeData', () => {
  it('preserves original rows and source indexes while retaining null gaps', () => {
    const source = [
      { x: 1, first: 2 },
      { x: 2, first: null },
      { x: 3, first: 5 },
    ];
    const result = normalizeData(source, series, x);
    expect(result.rows.map((row) => row.datum)).toEqual(source);
    expect(result.rows.map((row) => row.sourceIndex)).toEqual([0, 1, 2]);
    expect(result.rows[1].values.first).toBeNull();
  });

  it.each([
    [
      'duplicate x',
      [
        { x: 1, first: 1 },
        { x: 1, first: 2 },
      ],
      'duplicate x value',
    ],
    [
      'descending x',
      [
        { x: 2, first: 1 },
        { x: 1, first: 2 },
      ],
      'strictly ascending',
    ],
    ['invalid y', [{ x: 1, first: Number.NaN }], 'expected a finite number or null'],
  ])('rejects %s with a precise message', (_label, rows, message) => {
    expect(() => normalizeData(rows, series, x)).toThrow(message);
  });

  it('rejects duplicate series ids', () => {
    const duplicate = [series[0], { ...series[1], id: 'first' }];
    expect(() => normalizeData([{ x: 1, first: 1 }], duplicate, x)).toThrow('duplicate series id');
  });

  it('rejects appearance values that would produce broken SVG marks', () => {
    const row = [{ x: 1, first: 1 }];
    expect(() => normalizeData(row, [{ ...series[0], bar: { radius: Number.NaN } }], x)).toThrow(
      'Invalid bar.radius',
    );
    expect(() => normalizeData(row, [{ ...series[0], line: { opacity: 1.5 } }], x)).toThrow(
      'Invalid line.opacity',
    );
  });
});

describe('domains and canonical geometry', () => {
  it('handles zeros, constants and negative values without a collapsed domain', () => {
    const zero = normalizeData(
      [
        { x: 1, first: 0 },
        { x: 2, first: 0 },
      ],
      series,
      x,
    );
    const constant = normalizeData(
      [
        { x: 1, first: 4 },
        { x: 2, first: 4 },
      ],
      series,
      x,
    );
    const negative = normalizeData(
      [
        { x: 1, first: -4 },
        { x: 2, first: -2 },
      ],
      series,
      x,
    );
    expect(computeYDomain(zero, [series[0]])).toEqual([0, 1]);
    expect(computeYDomain(constant, [series[0]])[0]).toBe(0);
    expect(computeYDomain(constant, [series[0]])[1]).toBeGreaterThan(4);
    expect(computeYDomain(negative, [series[0]])[1]).toBe(0);
    // Rows normalized before a series existed carry nothing for it; the domain ignores it.
    const earlier = normalizeData(
      [
        { x: 1, first: 4 },
        { x: 2, first: 6 },
      ],
      [series[0]],
      x,
    );
    expect(computeYDomain(earlier, series).every(Number.isFinite)).toBe(true);
    // Geometry draws nothing for it rather than a broken path.
    const drawn = buildGeometry(earlier, {
      plotLeft: 0,
      plotTop: 0,
      plotWidth: 100,
      plotHeight: 100,
      xDomain: [1, 2],
      yDomain: [0, 10],
      series,
      curveBySeries: { first: 'linear', second: 'linear' },
    }).series;
    expect(drawn.second?.segments ?? []).toEqual([]);
    expect(drawn.first?.segments[0]?.path).not.toContain('NaN');
  });

  it('keeps stroke and area geometry on the same recorded boundary and does not bridge gaps', () => {
    const data = normalizeData(
      [
        { x: 0, first: 0 },
        { x: 1, first: null },
        { x: 2, first: 4 },
        { x: 3, first: 2 },
      ],
      [series[0]],
      x,
    );
    const geometry = buildGeometry(data, {
      plotLeft: 10,
      plotTop: 5,
      plotWidth: 300,
      plotHeight: 100,
      xDomain: [0, 3],
      yDomain: [0, 4],
      series: [series[0]],
      curveBySeries: { first: 'linear' },
    }).series.first;
    expect(geometry.segments).toHaveLength(1);
    expect(geometry.segments[0].areaPath.startsWith(geometry.segments[0].path)).toBe(true);
    expect(pointAtX(geometry, 260)?.y).toBeCloseTo(30);
    expect(pointAtX(geometry, 110)).toBeNull();
  });

  it('renders a singleton as an isolated point and matches its topology', () => {
    const one = normalizeData([{ x: 3, first: 7 }], [series[0]], x);
    const built = buildGeometry(one, {
      plotLeft: 10,
      plotTop: 5,
      plotWidth: 300,
      plotHeight: 100,
      xDomain: [2.5, 3.5],
      yDomain: [0, 10],
      series: [series[0]],
      curveBySeries: { first: 'linear' },
    }).series.first;
    expect(built.isolated).toHaveLength(1);
    const next = normalizeData([{ x: 3, first: 9 }], [series[0]], x);
    expect(hasMatchingTopology(one, next, [series[0]])).toBe(true);
  });

  it('keeps irregular step intervals flat and selects the observed value at each transition', () => {
    const rows = [
      { x: 0, first: 2 },
      { x: 1, first: 5 },
      { x: 4, first: 3 },
      { x: 7, first: null },
      { x: 8, first: 6 },
    ];
    for (const curve of ['step-after', 'step-before'] as const) {
      const descriptor = { ...series[0], curve };
      const data = normalizeData(rows, [descriptor], x);
      const geometry = buildGeometry(data, {
        plotLeft: 0,
        plotTop: 0,
        plotWidth: 800,
        plotHeight: 100,
        xDomain: [0, 8],
        yDomain: [0, 10],
        series: [descriptor],
        curveBySeries: { first: curve },
      }).series.first;
      expect(geometry.segments).toHaveLength(1);
      expect(pointAtX(geometry, 100)?.y).toBeCloseTo(50);
      expect(pointAtX(geometry, 200)?.y).toBeCloseTo(curve === 'step-after' ? 50 : 70);
      expect(pointAtX(geometry, 700)).toBeNull();
      expect(geometry.segments[0].areaPath.startsWith(geometry.segments[0].path)).toBe(true);
    }
  });

  it('uses explicit observation status without inferring the final row', () => {
    type StatusRow = { x: number; first: number; status: 'observed' | 'provisional' | 'forecast' };
    const descriptor: ChartSeries<StatusRow> = {
      id: 'first',
      label: 'First',
      accessor: (row) => row.first,
      status: (row) => row.status,
    };
    const rows: StatusRow[] = [
      { x: 0, first: 2, status: 'observed' },
      { x: 1, first: 4, status: 'provisional' },
      { x: 2, first: 5, status: 'observed' },
    ];
    const data = normalizeData(rows, [descriptor], x);
    expect(data.rows.map((row) => row.statuses.first)).toEqual([
      'observed',
      'provisional',
      'observed',
    ]);
    const geometry = buildGeometry(data, {
      plotLeft: 0,
      plotTop: 0,
      plotWidth: 200,
      plotHeight: 100,
      xDomain: [0, 2],
      yDomain: [0, 10],
      series: [descriptor],
      curveBySeries: { first: 'linear' },
    }).series.first;
    expect(geometry.segments.map((segment) => segment.status)).toEqual(['provisional', 'observed']);
    expect(pointAtX(geometry, 100)?.y).toBeCloseTo(60);
    expect(() =>
      normalizeData<StatusRow>(
        [{ x: 0, first: 1, status: 'invalid' as StatusRow['status'] }],
        [descriptor],
        x,
      ),
    ).toThrow('Invalid status');
  });

  it('normalizes companion fields, fits them into the domain and leaves null gaps open', () => {
    type RangeRow = {
      x: number;
      first: number | null;
      lower: number | null;
      upper: number | null;
    };
    const descriptor: ChartSeries<RangeRow> = {
      id: 'first',
      label: 'First',
      accessor: (row) => row.first,
      fields: {
        lower: { label: 'Low', accessor: (row) => row.lower },
        upper: { label: 'High', accessor: (row) => row.upper },
      },
    };
    const rows: RangeRow[] = [
      { x: 0, first: -2, lower: -5, upper: 1 },
      { x: 1, first: 2, lower: -1, upper: 4 },
      { x: 2, first: null, lower: null, upper: null },
      { x: 3, first: 3, lower: 0, upper: 7 },
      { x: 4, first: 4, lower: 1, upper: 8 },
    ];
    const data = normalizeData(rows, [descriptor], x);
    expect(data.rows[0].fields.first).toEqual({ lower: -5, upper: 1 });
    expect(data.rows[2].fields.first).toEqual({ lower: null, upper: null });
    expect(computeYDomain(data, [descriptor])).toEqual([-10, 10]);
    const paths = bandPaths(data.rows, 'first', 'lower', 'upper', {
      x: (value) => value * 100,
      y: (value) => 50 - value * 5,
      xDomain: [0, 4],
      columnWidth: 0,
    });
    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toContain('200,');
    expect(() =>
      normalizeData([{ x: 0, first: 2, lower: Number.NaN, upper: 4 }], [descriptor], x),
    ).toThrow('field "lower"');
    expect(() =>
      normalizeData(
        [{ x: 0, first: 2, lower: 0, upper: 4 }],
        [{ ...descriptor, fields: { lower: { label: '', accessor: () => 1 } } }],
        x,
      ),
    ).toThrow('expected a label and an accessor');
    expect(() =>
      assertOrdered(
        'IntervalBand',
        normalizeData([{ x: 0, first: 2, lower: 4, upper: 3 }], [descriptor], x).rows,
        'first',
        ['lower', 'upper'],
      ),
    ).toThrow('lower ≤ upper');
  });
});
