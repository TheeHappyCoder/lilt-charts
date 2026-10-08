import { describe, expect, it } from 'vitest';
import { barCells } from './bar-shape';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IsometricBar } from './isometric-bar';

const total = (cells: { height: number }[]) => cells.reduce((sum, cell) => sum + cell.height, 0);

it('preserves provisional and forecast paint on the isometric front', () => {
  for (const fill of ['url(#provisional-hatch)', 'url(#forecast-dots)']) {
    const html = renderToStaticMarkup(
      createElement(IsometricBar, {
        bar: { x: 0, y: 10, width: 40, height: 90, baseline: 100, valueX: 0, negative: false },
        mark: { stacked: false, geometry: {}, seriesIds: ['a'], seriesId: 'a' },
        id: 'bar',
        color: '#7454db',
        fill,
        fillOpacity: 0.7,
      }),
    );
    expect(html).toMatch(
      new RegExp(`data-lilt-bar-face="front"[^>]+fill="${fill.replace(/[()]/g, '\\$&')}"`),
    );
    expect(html).toContain('opacity="0.7"');
  }
});

describe('segmented bar cells', () => {
  it('fills from the baseline and trims the last cell to the exact value', () => {
    // A 15px bar: two whole 4px cells on a 6px pitch, then a 3px partial cell.
    const cells = barCells({ x: 0, y: 85, width: 10, height: 15 }, 100);
    expect(cells.map((cell) => [cell.y, cell.height])).toEqual([
      [96, 4],
      [90, 4],
      [85, 3],
    ]);
    expect(Math.max(...cells.map((cell) => cell.y + cell.height))).toBe(100);
    expect(Math.min(...cells.map((cell) => cell.y))).toBe(85);
  });

  it('keeps stacked segments on one grid so cells continue across a color change', () => {
    const lower = barCells({ x: 0, y: 88, width: 10, height: 12 }, 100);
    const upper = barCells({ x: 0, y: 76, width: 10, height: 12 }, 100);
    const pitchAligned = (y: number) => (((100 - y) % 6) + 6) % 6;
    for (const cell of [...lower, ...upper])
      expect([0, 4].includes(pitchAligned(cell.y + cell.height))).toBe(true);
    expect(total(lower) + total(upper)).toBe(16);
  });

  it('grows downward for negative bars', () => {
    const cells = barCells({ x: 0, y: 100, width: 10, height: 10 }, 100);
    expect(cells[0]).toMatchObject({ y: 100, height: 4 });
    expect(Math.max(...cells.map((cell) => cell.y + cell.height))).toBe(110);
  });
});
