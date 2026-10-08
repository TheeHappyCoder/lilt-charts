import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChartPaintDefs, fillFor, paintId } from './paint';
import type { ChartSeries } from './types';

type Row = { x: number; jade: number; blue: number };
const series: ChartSeries<Row>[] = [
  { id: 'jade', label: 'Jade', accessor: (row) => row.jade, color: '#168267' },
  { id: 'blue', label: 'Blue', accessor: (row) => row.blue, color: '#3975df' },
];

describe('series scoped paint', () => {
  it('gives different colors and IDs to both series across chart instances', () => {
    const first = renderToStaticMarkup(
      <svg>
        <defs>
          <ChartPaintDefs chartId="chart-a" series={series} />
        </defs>
      </svg>,
    );
    const second = renderToStaticMarkup(
      <svg>
        <defs>
          <ChartPaintDefs chartId="chart-b" series={series} />
        </defs>
      </svg>,
    );
    expect(first).toContain('id="chart-a-paint-0-fade"');
    expect(first).toContain('id="chart-a-paint-1-fade"');
    expect(first).toContain('stop-color="#168267"');
    expect(first).toContain('stop-color="#3975df"');
    expect(second).toContain('id="chart-b-paint-0-fade"');
    expect(second).not.toContain('id="chart-a-paint-0-fade"');
    expect(fillFor('#3975df', undefined, 'fade', paintId('chart-a', 1, 'fade'))).toBe(
      'url(#chart-a-paint-1-fade)',
    );
  });
});
