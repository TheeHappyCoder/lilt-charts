// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { serializeChartSvg } from './export-chart-svg';

describe('static SVG export', () => {
  it('serializes a scoped painted plot with an accessible caption and resolved dimensions', () => {
    const root = document.createElement('div');
    root.style.setProperty('--lilt-surface', '#ffffff');
    root.innerHTML =
      '<svg class="lilt-chart__svg" width="320" height="180" aria-label="Original"><defs><linearGradient id="local-fill"><stop offset="0" stop-color="#168267" /></linearGradient></defs><path d="M0 0 L10 10" fill="url(#local-fill)" /></svg>';
    const text = serializeChartSvg(root, {
      title: 'Revenue chart',
      description: 'Measured daily revenue.',
    });
    expect(text).toContain('viewBox="0 0 320 180"');
    expect(text).toContain('Revenue chart');
    expect(text).toContain('Measured daily revenue.');
    expect(text).toContain('id="local-fill"');
    expect(text).toContain('fill="url(#local-fill)"');
    expect(text).toContain('fill="#ffffff"');
  });
  it('states SVG-only coverage for HTML families', () => {
    expect(() => serializeChartSvg(document.createElement('div'), { title: 'A chart' })).toThrow(
      /no SVG plot/,
    );
    expect(() => serializeChartSvg(document.createElement('div'), { title: '' })).toThrow(
      /accessible title/,
    );
    const htmlChartWithIcon = document.createElement('div');
    htmlChartWithIcon.innerHTML = '<svg width="16" height="16"><path d="M0 0" /></svg>';
    expect(() => serializeChartSvg(htmlChartWithIcon, { title: 'HTML chart' })).toThrow(
      /no SVG plot/,
    );
  });
  it('selects the chart plot when the wrapper contains an earlier icon SVG', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<svg width="16" height="16"><path d="M0 0" /></svg><svg class="lilt-chart__svg" width="320" height="180"><path d="M0 0 L10 10" /></svg>';
    const text = serializeChartSvg(root, { title: 'Measured chart' });
    expect(text).toContain('width="320"');
    expect(text).toContain('M0 0 L10 10');
  });
});
