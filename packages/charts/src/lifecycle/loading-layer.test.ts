import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LoadingLayer,
  SKELETON_CYCLE,
  buildSkeletonGeometry,
  skeletonClock,
} from './loading-layer';

describe('loading skeleton geometry', () => {
  it.each([
    [360, 278, 65, 12, 12, 44, 234],
    [1280, 330, 72, 12, 12, 44, 286],
  ])(
    'closes the area at the plot bottom for %dpx width',
    (width, height, left, right, top, bottom, expectedBottom) => {
      const geometry = buildSkeletonGeometry({ width, height, left, right, top, bottom });
      expect(geometry.plotBottom).toBe(expectedBottom);
      expect(geometry.areaPath).toMatch(
        new RegExp(`L[0-9.]+,${expectedBottom} L[0-9.]+,${expectedBottom} Z$`),
      );
      expect((geometry.gridRows.match(/<line/g) ?? []).length).toBe(5);
      expect((geometry.yBars.match(/<rect/g) ?? []).length).toBe(5);
      expect((geometry.xBars.match(/<rect/g) ?? []).length).toBe(4);
    },
  );
});

describe('skeleton axis presets', () => {
  const box = { width: 400, height: 240, left: 0, right: 0, top: 8, bottom: 28 };
  const rects = (html: string) =>
    [...html.matchAll(/x="([-\d.]+)" y="[-\d.]+" width="([-\d.]+)"/g)].map((match) => ({
      x: Number(match[1]),
      width: Number(match[2]),
    }));

  it('mirrors the minimal axis: a baseline, no y placeholders, and two end labels inside the plot', () => {
    const geometry = buildSkeletonGeometry({ ...box, axis: 'minimal', inset: 20, edge: 0 });
    expect(geometry.gridRows.match(/<line/g)).toHaveLength(1);
    expect(geometry.yBars).toBe('');
    const bars = rects(geometry.xBars);
    expect(bars).toHaveLength(2);
    for (const bar of bars) {
      expect(bar.x).toBeGreaterThanOrEqual(4);
      expect(bar.x + bar.width).toBeLessThanOrEqual(396);
    }
    expect(geometry.contour.startsWith('M0,')).toBe(true);
  });

  it('draws inline y placeholders inside the plot and no grid for dots', () => {
    expect(rects(buildSkeletonGeometry({ ...box, axis: 'inline', inset: 20 }).yBars)[0]?.x).toBe(
      20,
    );
    expect(buildSkeletonGeometry({ ...box, axis: 'dots' }).gridRows).toBe('');
  });
});

describe('loading styles', () => {
  const layer = (props: Partial<Parameters<typeof LoadingLayer>[0]>) =>
    renderToStaticMarkup(
      createElement(LoadingLayer, {
        width: 400,
        height: 200,
        left: 0,
        right: 0,
        top: 10,
        bottom: 20,
        visible: true,
        opacity: 1,
        reducedMotion: false,
        id: 'skeleton',
        marks: 'bars',
        barCount: 6,
        seriesCount: 2,
        ...props,
      }),
    );

  it('draws one shape per bar, stepped left to right, and sweeps only still shapes', () => {
    const shimmer = layer({});
    expect(shimmer.match(/class="lilt-chart__skeleton-bar"/g)).toHaveLength(12);
    expect(shimmer).toContain('data-style="shimmer"');
    expect(shimmer).toContain('lilt-chart__skeleton-sheen');
    expect(shimmer).toContain('--lilt-skeleton-step:5');
    for (const loadingStyle of ['draw', 'breathe'] as const) {
      const moving = layer({ loadingStyle });
      expect(moving).toContain(`data-style="${loadingStyle}"`);
      expect(moving).not.toContain('lilt-chart__skeleton-sheen');
    }
  });

  it.each(['draw', 'breathe'] as const)(
    'animates contours with %s, retaining depth paint',
    (loadingStyle) => {
      for (const marks of ['line', 'area-stack'] as const) {
        for (const lineDepth of [false, true]) {
          const html = layer({ marks, loadingStyle, lineDepth, seriesCount: 3 });
          expect(html).toContain(`data-style="${loadingStyle}"`);
          expect(html).toContain('lilt-chart__skeleton-reveal');
          expect(html).toContain('lilt-chart__skeleton-wave');
          expect(html).toContain('lilt-chart__skeleton-swell');
          expect(html).not.toContain('lilt-chart__skeleton-sheen');
          // Drawing runs a pen with a head along each contour, and fills the area behind it.
          const contours = 3;
          const draw = loadingStyle === 'draw';
          expect(html.includes('clip-path="url(#skeleton-contour-clip)"')).toBe(draw);
          expect((html.match(/class="lilt-chart__skeleton-head"/g) ?? []).length).toBe(
            draw ? contours * 2 : 0,
          );
          expect(html).toContain('lilt-chart__skeleton-pen');
          // One pen per series, for lines as for stacked areas.
          expect((html.match(/data-lilt-tube=""/g) ?? []).length).toBe(lineDepth ? 3 : 0);
          const reduced = layer({ marks, loadingStyle, lineDepth, reducedMotion: true });
          expect(reduced).toContain('data-reduced-motion="true"');
          expect(reduced).not.toContain('lilt-chart__skeleton-sheen');
        }
      }
    },
  );

  it.each(['shimmer', 'draw', 'breathe'] as const)(
    'paints lit 3D faces for %s without changing flat companion bars',
    (loadingStyle) => {
      const html = layer({ loadingStyle, barAppearances: ['isometric', 'solid'], barWidth: 20 });
      expect(html.match(/data-lilt-bar-face="front"/g)).toHaveLength(6);
      expect(html.match(/data-lilt-bar-face="side"/g)).toHaveLength(6);
      expect(html.match(/data-lilt-bar-face="top"/g)).toHaveLength(6);
      expect(html.match(/<path class="lilt-chart__skeleton-bar"/g)).toHaveLength(6);
      expect(html).toContain('clip-path="url(#skeleton-bars-clip)"');
      expect(html).toContain('<rect x="0" y="2" width="400" height="178"');
      expect(html).toContain('--lilt-skeleton-bar-height:64.6px');
      expect(html).toContain('id="skeleton-bar-5-0-top"');
      const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(new Set(ids).size).toBe(ids.length);
      const silhouette = /<mask[^>]*><g[^>]*><path d="([^"]+)"/.exec(html)?.[1];
      const roof = /M[-\d.]+,([-\d.]+)L[-\d.]+,([-\d.]+)/.exec(silhouette ?? '');
      // The sheen includes the roof; its rise follows the requested 20px footprint.
      expect(Number(roof?.[1])).toBeCloseTo(115.4);
      expect(Number(roof?.[1]) - Number(roof?.[2])).toBeCloseTo((20 * 0.24 * 8) / 14);
      expect(html.includes('lilt-chart__skeleton-sheen')).toBe(loadingStyle === 'shimmer');
    },
  );

  it('keeps 3D placeholders static under reduced motion and out of line skeletons', () => {
    const html = layer({
      barAppearances: ['isometric', 'isometric'],
      loadingStyle: 'draw',
      reducedMotion: true,
    });
    expect(html).toContain('data-reduced-motion="true"');
    expect(html.match(/data-lilt-bar-face="front"/g)).toHaveLength(12);
    expect(html).not.toContain('lilt-chart__skeleton-sheen');
    expect(layer({ marks: 'line', barAppearances: ['isometric'] })).not.toContain(
      'data-lilt-bar-face',
    );
    expect(layer({})).not.toContain('data-lilt-bar-face');
  });

  it('puts every skeleton on one beat of the shared cycle', () => {
    expect(skeletonClock(0)).toBe('0ms');
    expect(skeletonClock(SKELETON_CYCLE * 3 + 700)).toBe('-700ms');
    expect(skeletonClock(SKELETON_CYCLE * 9 + 700)).toBe(skeletonClock(SKELETON_CYCLE + 700));
  });

  it.each(['line', 'area-stack'] as const)(
    'uses lit tubes for depth-aware %s loading contours',
    (marks) => {
      const html = layer({ marks, lineDepth: true, seriesCount: 3 });
      expect(html.match(/data-lilt-tube=""/g)).toHaveLength(3);
      expect(html).toContain('id="skeleton-line-shadow"');
      expect(html).toContain('lilt-chart__skeleton-sheen');
      expect(html).not.toContain('data-lilt-bar-face');
      expect(layer({ marks, lineDepth: false })).not.toContain('data-lilt-tube');
      expect(layer({ marks, lineDepth: true, reducedMotion: true })).not.toContain(
        'lilt-chart__skeleton-sheen',
      );
    },
  );
});
