import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrismPaths, ramp, shade, tubeLayers } from './depth-paint';
import { PrismBatches } from '../engine/ranges';
import { prismFaces } from '../engine/depth';

describe('depth paint', () => {
  it('shades in oklab and leaves the base color untouched at zero', () => {
    expect(shade('red', 0)).toBe('red');
    expect(shade('red', 20)).toBe('color-mix(in oklab, red, white 20.0%)');
    expect(shade('red', -20)).toBe('color-mix(in oklab, red, black 20.0%)');
  });

  it('eases between stops so gradients never band where their slope changes', () => {
    const stops = ramp('red', [
      [0, 10],
      [1, -10],
    ]);
    expect(stops.length).toBe(7);
  });

  it('lights a tube toward the upper left without leaving its outline', () => {
    const width = 20;
    const layers = tubeLayers(width);
    expect(layers[0]!.strokeWidth).toBe(width);
    expect(layers.at(-1)!.amount).toBeGreaterThan(layers[0]!.amount);
    for (const layer of layers) {
      const [, dx, dy] = /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(layer.transform)!.map(Number);
      expect(dx).toBeLessThanOrEqual(0);
      expect(dy).toBeLessThanOrEqual(0);
      // Shifted no further than the room its narrower stroke leaves inside the full one.
      expect(Math.hypot(dx, dy) + layer.strokeWidth / 2).toBeLessThanOrEqual(width / 2 + 1e-9);
    }
    // A groove's shade falls on its upper-left wall instead.
    expect(tubeLayers(width, 'groove').at(-1)!.transform).not.toContain('-');
  });

  it('batches sides, then tops, then fronts', () => {
    const batches = new PrismBatches();
    batches.add('red', prismFaces(0, 0, 20, 40));
    const html = renderToStaticMarkup(
      <svg>
        <PrismPaths batches={batches} />
      </svg>,
    );
    const fills = [...html.matchAll(/fill:([^"]+)"/g)].map((match) => match[1]);
    expect(fills).toEqual([
      'color-mix(in oklab, red, black 40.0%)',
      'color-mix(in oklab, red, white 36.0%)',
      'red',
    ]);
  });
});
