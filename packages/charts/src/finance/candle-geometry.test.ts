import { describe, expect, it } from 'vitest';
import { normalizeData } from '../engine/normalize';
import type { RangeScales } from '../engine/ranges';
import type { ChartSeries } from '../types';
import { assertCandles, candlePaths, candleShape } from './candle-geometry';

type Row = { x: number; open: number; high: number; low: number; close: number };

const scales: RangeScales = {
  x: (value) => value,
  y: (value) => 100 - value,
  xDomain: [0, Infinity],
  columnWidth: 10,
};

const price: ChartSeries<Row> = {
  id: 'price',
  label: 'Price',
  accessor: (row) => row.close,
  fields: {
    open: { label: 'Open', accessor: (row) => row.open },
    high: { label: 'High', accessor: (row) => row.high },
    low: { label: 'Low', accessor: (row) => row.low },
  },
};
const fields = { open: 'open', high: 'high', low: 'low' };

function rows(data: Row[]) {
  return normalizeData(data, [price], { type: 'number', accessor: (row: Row) => row.x }).rows;
}

describe('candle geometry', { timeout: 15_000 }, () => {
  const up = { open: 10, high: 20, low: 5, close: 15, up: true };
  const down = { open: 15, high: 20, low: 5, close: 10, up: false };

  it('draws a body between open and close with wicks that stop at the body', () => {
    const shape = candleShape(50, up, scales, 'candle');
    expect(shape.body).toContain('M46.5,85');
    expect(shape.hollow).toBeNull();
    expect(shape.stroke).toBe('M50,80V85M50,90V95');
  });

  it('outlines rising bodies when hollow and fills falling ones', () => {
    expect(candleShape(50, up, scales, 'hollow')).toMatchObject({ body: null });
    expect(candleShape(50, up, scales, 'hollow').hollow).toContain('M47,85.5');
    expect(candleShape(50, down, scales, 'hollow').hollow).toBeNull();
  });

  it('draws OHLC bars with an open tick left and a close tick right', () => {
    expect(candleShape(50, up, scales, 'ohlc')).toEqual({
      body: null,
      hollow: null,
      stroke: 'M50,80V95M45,90H50M50,85H55',
      side: null,
      top: null,
    });
  });

  it('keeps a doji visible as a one-pixel body', () => {
    const shape = candleShape(50, { ...up, close: 10 }, scales, 'candle');
    expect(shape.body).toContain(',89.5');
  });

  it('batches thousands of candles into four paths', () => {
    const data = Array.from({ length: 5000 }, (_, index) => {
      const open = 100 + Math.sin(index) * 10;
      const close = open + (index % 2 ? 3 : -3);
      return {
        x: index,
        open,
        close,
        high: Math.max(open, close) + 2,
        low: Math.min(open, close) - 2,
      };
    });
    const paths = candlePaths(
      rows(data),
      'price',
      fields,
      { ...scales, columnWidth: 1 },
      'candle',
      (_, candle) => (candle.up ? 'up' : 'down'),
    );
    expect(paths.bodies.length + paths.hollow.length + paths.strokes.length).toBe(4);
    // Building every path is linear and quick; hover reuses it rather than rebuilding it.
    const normalized = rows(data);
    const started = performance.now();
    for (let run = 0; run < 10; run += 1)
      candlePaths(normalized, 'price', fields, { ...scales, columnWidth: 1 }, 'hollow', () => 'c');
    expect((performance.now() - started) / 10).toBeLessThan(40);
  });

  it('rejects a high below the body', () => {
    expect(() =>
      assertCandles(
        rows([{ x: 0, open: 10, high: 12, low: 5, close: 15 }]) as never,
        'price',
        fields,
      ),
    ).toThrow('low ≤ open, close ≤ high at row 1');
  });
});

describe('candles with depth', () => {
  const up = { open: 20, high: 40, low: 10, close: 30, up: true };

  it('keeps the body front on open and close, centered on the wick', () => {
    const shape = candleShape(50, up, scales, 'candle', true);
    const [, left, top, width, height] = /^M([\d.]+),([\d.]+)h([\d.]+)v([\d.]+)/
      .exec(shape.body!)!
      .map(Number);
    expect(top).toBe(70);
    expect(height).toBe(10);
    expect(left + width / 2).toBeCloseTo(50, 1);
    expect(shape.stroke).toContain('M50,');
    expect(shape.side).not.toBeNull();
    expect(shape.top).not.toBeNull();
  });

  it('leaves OHLC bars flat', () => {
    const shape = candleShape(50, up, scales, 'ohlc', true);
    expect(shape.side).toBeNull();
    expect(shape.top).toBeNull();
  });
});
