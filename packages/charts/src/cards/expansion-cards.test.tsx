// @vitest-environment jsdom
import { act, cloneElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservationsCardProps, ObservationScene } from './observations-card';
import { SKELETON_EXIT_MS } from '../lifecycle/skeleton-exit';
import { StreamgraphCard, streamgraphLayout } from './trend-forms';
import {
  DivergingBarCard,
  MirroredBarCard,
  ComparativeFunnelCard,
  divergingLayout,
  mirroredLayout,
  comparativeFunnelLayout,
} from './comparison-forms';
import { NestedDonutCard, nestedDonutLayout } from './composition-forms';
import {
  GoalPacingCard,
  MilestoneProgressCard,
  pacingLayout,
  milestoneLayout,
} from './progress-forms';
import {
  ViolinCard,
  CorrelationMatrixCard,
  violinDensity,
  violinLayout,
  pairedCorrelation,
  correlationLayout,
} from './distribution-forms';
import { TreemapChartCard } from './treemap-chart-card';
import { scatterTrails, ScatterChartCard } from './scatter-chart-card';
import { LineChartCard } from './line-chart-card';
import { AreaChartCard } from './area-chart-card';
import { HorizontalBarChartCard } from './horizontal-bar-chart-card';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const rows = [
  { label: 'A', x: 0, a: 30, b: 20, n: 10 },
  { label: 'B', x: 1, a: 20, b: 12, n: 8 },
  { label: 'C', x: 2, a: 10, b: 6, n: 4 },
];
const tree = [
  { path: 'A/One', value: 10 },
  { path: 'A/Two', value: 20 },
  { path: 'B/Three', value: 30 },
];
const samples = [
  { group: 'A', value: 1 },
  { group: 'A', value: 2 },
  { group: 'A', value: 4 },
  { group: 'B', value: 3 },
  { group: 'B', value: 4 },
  { group: 'B', value: 8 },
];
const series = [
  { key: 'a', side: 'negative' as const },
  { key: 'n', side: 'neutral' as const },
  { key: 'b', side: 'positive' as const },
] as const;
const families = [
  ['stream', <StreamgraphCard data={rows} x="x" series={[{ key: 'a' }, { key: 'b' }]} />, 6],
  ['diverging', <DivergingBarCard data={rows} category="label" series={series} />, 9],
  ['mirrored', <MirroredBarCard data={rows} category="label" left="a" right="b" />, 6],
  [
    'funnel',
    <ComparativeFunnelCard data={rows} stage="label" cohorts={[{ key: 'a' }, { key: 'b' }]} />,
    6,
  ],
  ['nested', <NestedDonutCard data={tree} path="path" value="value" />, 5],
  ['pacing', <GoalPacingCard data={rows} x="x" actual="a" expected="b" at={1} target={40} />, 5],
  [
    'milestones',
    <MilestoneProgressCard data={rows} label="label" position="a" current={15} target={40} />,
    3,
  ],
  ['violin', <ViolinCard data={samples} category="group" value="value" />, 10],
  ['correlation', <CorrelationMatrixCard data={rows} metrics={[{ key: 'a' }, { key: 'b' }]} />, 4],
] as const;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 560,
    height: 320,
    top: 0,
    left: 0,
    right: 560,
    bottom: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(element: ReactElement, props: Partial<ObservationsCardProps<unknown>> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = async (next: typeof props) => {
    await act(async () =>
      root.render(cloneElement(element as ReactElement<typeof props>, { ...props, ...next })),
    );
  };
  await render({});
  return {
    host,
    render,
    close: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
const marks = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLButtonElement>(
    '.lilt-observations-card__mark:not([data-departing])',
  ),
];

describe.each(families)('%s lifecycle and interaction', (_name, element, count) => {
  it.each(['shimmer', 'draw', 'breathe'] as const)(
    'keeps its %s silhouette until the opacity exit completes',
    async (loadingStyle) => {
      const view = await mount(element, { loading: true, loadingStyle, depth: true });
      try {
        const skeleton = view.host.querySelector('.lilt-skeleton');
        expect(skeleton?.getAttribute('data-style')).toBe(loadingStyle);
        expect(skeleton?.querySelector('rect, path')).not.toBeNull();
        expect(marks(view.host)).toHaveLength(0);
        expect(view.host.querySelector('.lilt-card__value')?.textContent).not.toMatch(/\d/);
        expect(view.host.querySelector('table')).toBeNull();
        await view.render({ loading: false });
        expect(view.host.querySelector('[data-skeleton-leaving]')).not.toBeNull();
        expect(view.host.querySelector('.lilt-skeleton')).toBe(skeleton);
        expect(marks(view.host)).toHaveLength(0);
        await act(async () => vi.advanceTimersByTime(SKELETON_EXIT_MS + 1));
        expect(view.host.querySelector('.lilt-skeleton')).toBeNull();
        expect(marks(view.host)).toHaveLength(count);
        expect(view.host.querySelector('table')).not.toBeNull();
      } finally {
        view.close();
      }
    },
  );

  it('skips decorative motion and reuses keyboard pin, release and navigation', async () => {
    const onSelectionChange = vi.fn();
    const view = await mount(element, { loading: true, motion: 'none', onSelectionChange });
    try {
      expect(view.host.querySelector('.lilt-skeleton[data-reduced-motion]')).not.toBeNull();
      expect(view.host.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
      await view.render({ loading: false });
      expect(marks(view.host)).toHaveLength(count);
      const [first, second] = marks(view.host);
      await act(async () => first!.focus());
      await act(async () =>
        first!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
      );
      expect(document.activeElement).toBe(second);
      await act(async () => second!.click());
      expect(second!.getAttribute('aria-pressed')).toBe('true');
      expect(onSelectionChange.mock.lastCall?.[0]).toMatchObject({ pinned: true });
      expect(onSelectionChange.mock.lastCall?.[0].row).toBeDefined();
      await act(async () =>
        second!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      );
      expect(second!.getAttribute('aria-pressed')).toBe('false');
    } finally {
      view.close();
    }
  });

  it('keeps accepted readings while refreshing and clears them after an empty response', async () => {
    const view = await mount(element, { motion: 'none' });
    try {
      const before = view.host.querySelector('.lilt-card__value')?.textContent;
      await view.render({ loading: true, data: [] });
      expect(marks(view.host)).toHaveLength(count);
      expect(view.host.querySelector('.lilt-skeleton')).toBeNull();
      expect(view.host.querySelector('.lilt-card__value')?.textContent).toBe(before);
      expect(view.host.textContent).toContain('Updating');
      await view.render({ loading: false, data: [] });
      expect(marks(view.host)).toHaveLength(0);
      expect(view.host.querySelector('.lilt-chart-empty')).not.toBeNull();
      expect(view.host.querySelector('.lilt-card__value')?.textContent).not.toMatch(/\d/);
    } finally {
      view.close();
    }
  });

  it('inspects on pointer entry and preserves geometry when depth changes', async () => {
    const onSelectionChange = vi.fn();
    const view = await mount(element, { motion: 'none', onSelectionChange });
    try {
      const positions = () =>
        marks(view.host).map((mark) => [
          mark.style.left,
          mark.style.top,
          mark.style.width,
          mark.style.height,
        ]);
      const before = positions();
      await view.render({ depth: true });
      expect(positions()).toEqual(before);
      await act(async () =>
        marks(view.host)[0]!.dispatchEvent(new Event('pointerover', { bubbles: true })),
      );
      expect(onSelectionChange.mock.lastCall?.[0]).toMatchObject({ pinned: false });
      expect(marks(view.host)[0]!.hasAttribute('data-active')).toBe(true);
      if (marks(view.host)[0]!.dataset.shape === 'ribbon') {
        expect(marks(view.host)[0]!.style.clipPath).toMatch(/^path\('/);
        expect(marks(view.host)[0]!.querySelector('path')?.getAttribute('d')).toBeTruthy();
      }
    } finally {
      view.close();
    }
  });
});

function finite(scene: ObservationScene<unknown>) {
  expect(scene.error).toBeUndefined();
  for (const mark of scene.marks) {
    expect([mark.x, mark.y, mark.width, mark.height].every(Number.isFinite)).toBe(true);
    expect(mark.width).toBeGreaterThan(0);
    expect(mark.height).toBeGreaterThan(0);
    expect(mark.ribbon ?? '').not.toMatch(/NaN|Infinity/);
  }
  for (const path of scene.paths ?? []) expect(path.d).not.toMatch(/NaN|Infinity/);
}

describe('expanded chart encodings', () => {
  it('retains scatter trails and accepted readings through a warm refresh', async () => {
    const view = await mount(
      <ScatterChartCard data={rows} x="x" y="a" label="label" trails motion="none" />,
    );
    try {
      const paths = () => view.host.querySelectorAll('.lilt-scatter-card__trail');
      expect(paths()).toHaveLength(2);
      const before = view.host.querySelector('.lilt-card__value')?.textContent;
      await view.render({ loading: true, data: [] });
      expect(paths()).toHaveLength(2);
      expect(view.host.querySelector('.lilt-card__value')?.textContent).toBe(before);
      expect(view.host.textContent).toContain('Updating');
      await view.render({ loading: false, data: [] });
      expect(paths()).toHaveLength(0);
      expect(view.host.querySelector('.lilt-chart-empty')).not.toBeNull();
    } finally {
      view.close();
    }
  });
  it('leaves a zero indexed baseline unindexable instead of substituting a later starting value', async () => {
    const view = await mount(
      <LineChartCard
        data={[
          { x: 0, a: 0 },
          { x: 1, a: 20 },
        ]}
        x="x"
        series={[{ key: 'a' }]}
        indexed
        motion="none"
      />,
    );
    try {
      await act(async () => vi.advanceTimersByTime(400));
      expect(view.host.querySelector('.lilt-card__value')?.textContent).not.toMatch(/\d/);
    } finally {
      view.close();
    }
  });
  it('centers streams, preserves exact rows, and breaks all layers at a missing contribution', () => {
    const scene = streamgraphLayout(rows, 'x', [{ key: 'a' }, { key: 'b' }], 'linear', 560, 260);
    finite(scene);
    expect(scene.marks[0]!.datum).toBe(rows[0]);
    expect(scene.headline).toBe(16);
    expect(scene.marks[0]!.value).toBe(30);
    const gap = streamgraphLayout(
      [rows[0], { ...rows[1]!, b: null }, rows[2]],
      'x',
      [{ key: 'a' }, { key: 'b' }],
      'linear',
      560,
      260,
    );
    finite(gap);
    expect(gap.marks).toHaveLength(4);
    expect(gap.readings).toHaveLength(6);
    expect(gap.paths?.[0]?.d.match(/M/g)).toHaveLength(2);
    expect(
      streamgraphLayout([{ x: 0, a: -1 }], 'x', [{ key: 'a' }], 'linear', 560, 260).error,
    ).toMatch(/nonnegative/);
    expect(
      streamgraphLayout([rows[0], rows[0]], 'x', [{ key: 'a' }], 'linear', 560, 260).error,
    ).toMatch(/unique/);
  });
  it('places half the neutral response on each side and uses proportional segment lengths', () => {
    const scene = divergingLayout(rows, 'label', series, false, 560, 260);
    finite(scene);
    const [negative, neutral, positive] = scene.marks;
    expect(negative!.x + negative!.width).toBeCloseTo(neutral!.x);
    expect(neutral!.x + neutral!.width).toBeCloseTo(positive!.x);
    expect(negative!.width / neutral!.width).toBeCloseTo(3);
    const percent = divergingLayout(rows, 'label', series, true, 560, 260);
    expect(percent.marks[0]!.value).toBe(30);
    expect(percent.marks[0]!.description).toContain('50.0%');
    expect(
      divergingLayout([{ label: 'Gap', a: 2, b: null, n: 1 }], 'label', series, true, 560, 260)
        .marks,
    ).toHaveLength(0);
    expect(
      divergingLayout(
        [{ label: 'Huge', a: 1e308, b: 1e308, n: 1e308 }],
        'label',
        series,
        true,
        560,
        260,
      ).marks,
    ).toHaveLength(0);
  });
  it('uses one mirrored magnitude scale without turning missing readings into zero', () => {
    const scene = mirroredLayout(rows, 'label', ['a', 'b'], ['Previous', 'Current'], 560, 260);
    finite(scene);
    expect(scene.marks[0]!.width / scene.marks[1]!.width).toBeCloseTo(1.5);
    expect(scene.marks[0]!.x).toBeLessThan(280);
    expect(scene.marks[1]!.x).toBeGreaterThan(280);
    const gap = mirroredLayout(
      [{ label: 'A', a: 0, b: null }],
      'label',
      ['a', 'b'],
      ['A', 'B'],
      560,
      260,
    );
    expect(gap.readings?.map((r) => r.value)).toEqual([0, null]);
    expect(gap.marks).toHaveLength(1);
  });
  it('compares funnel cohorts on a common width and computes entry conversion', () => {
    const scene = comparativeFunnelLayout(rows, 'label', [{ key: 'a' }, { key: 'b' }], 560, 260);
    finite(scene);
    expect(scene.marks[0]!.width / scene.marks[3]!.width).toBeCloseTo(1.5);
    expect(scene.marks[2]!.description).toContain('33.3%');
    expect(scene.headline).toBe(16);
    expect(
      comparativeFunnelLayout([...rows].reverse(), 'label', [{ key: 'a' }, { key: 'b' }], 560, 260)
        .error,
    ).toMatch(/increase/);
  });
  it('sums leaves once and retains the complete nested branch', () => {
    const scene = nestedDonutLayout(tree, 'path', 'value', 0.3, 560, 260);
    finite(scene);
    expect(scene.headline).toBe(60);
    expect(scene.marks.find((m) => m.id === 'A')?.value).toBe(30);
    expect(scene.marks.find((m) => m.id === 'A/One')?.datum).toBe(tree[0]);
    expect(scene.marks.find((m) => m.id === 'A')?.related).toEqual(['A/One', 'A/Two']);
    expect(scene.marks.find((m) => m.id === 'A/One')?.related).toEqual(['A']);
    expect(
      nestedDonutLayout([{ path: 'A', value: null }], 'path', 'value', 0.3, 560, 260).headline,
    ).toBeNull();
  });
  it('honors the supplied cutoff and does not bridge a missing plan', () => {
    const data = [
      { x: 0, a: 0, e: 0 },
      { x: 10, a: 40, e: 50 },
      { x: 20, a: 90, e: 100 },
    ];
    const scene = pacingLayout(data, 'x', 'a', 'e', 15, 100, 560, 260);
    finite(scene);
    expect(scene.headline).toBe(40);
    expect(scene.groups?.[1]?.value).toBe(75);
    expect(scene.marks.filter((m) => m.group === 'a')).toHaveLength(2);
    expect(
      pacingLayout(
        [
          { x: 0, a: 0, e: 0 },
          { x: 10, a: null, e: null },
          { x: 20, a: 90, e: 100 },
        ],
        'x',
        'a',
        'e',
        15,
        100,
        560,
        260,
      ).groups?.[1]?.value,
    ).toBeNull();
    expect(pacingLayout(data, 'x', 'a', 'e', -1, 100, 560, 260).headline).toBeNull();
  });
  it('labels milestone state from position, retains overrun, and rejects duplicate checkpoints', () => {
    const scene = milestoneLayout(rows, 'label', 'a', 15, 40, 560, 170);
    finite(scene);
    expect(scene.marks.map((m) => m.description)).toEqual([
      'Completed',
      'Current checkpoint',
      'Upcoming',
    ]);
    expect(milestoneLayout(rows, 'label', 'a', 55, 40, 560, 170).headline).toBe(55);
    expect(
      milestoneLayout(rows, 'label', 'a', null, 40, 560, 170).marks.every(
        (m) => m.description === 'Progress unknown',
      ),
    ).toBe(true);
    expect(
      milestoneLayout([rows[0], { ...rows[1]!, a: 30 }], 'label', 'a', 15, 40, 560, 170).error,
    ).toMatch(/unique/);
  });
  it('estimates nonnegative density, exposes medians, and keeps individual sample positions', () => {
    const density = violinDensity([1, 2, 3, 4, 5], 1)!;
    expect(density.median).toBe(3);
    expect(density.points.every((p) => p.density >= 0)).toBe(true);
    const integral = density.points
      .slice(1)
      .reduce(
        (s, p, i) =>
          s + ((p.x - density.points[i]!.x) * (p.density + density.points[i]!.density)) / 2,
        0,
      );
    expect(integral).toBeCloseTo(1, 2);
    const scene = violinLayout(
      samples,
      'group',
      'value',
      undefined,
      true,
      undefined,
      'width',
      560,
      260,
    );
    finite(scene);
    expect(scene.groups?.map((g) => g.value)).toEqual([2, 4]);
    expect(scene.marks.find((m) => m.id === '0')?.datum).toBe(samples[0]);
    expect(
      violinLayout(samples, 'group', 'value', undefined, true, 0, 'width', 560, 260).error,
    ).toMatch(/positive/);
  });
  it('computes pairwise-complete Pearson correlation and leaves constants undefined', () => {
    expect(
      pairedCorrelation([
        [1, 3],
        [2, 2],
        [3, 1],
        [null, 5],
      ]),
    ).toEqual({ value: -1, count: 3 });
    expect(
      pairedCorrelation([
        [1, 5],
        [1, 5],
        [1, 5],
      ]).value,
    ).toBeNull();
    expect(
      pairedCorrelation([
        [1, 2],
        [2, 4],
      ]).value,
    ).toBeNull();
    expect(
      pairedCorrelation([
        [1e300, 1e300],
        [2e300, 2e300],
        [3e300, 3e300],
      ]).value,
    ).toBeCloseTo(1);
    const scene = correlationLayout(rows, [{ key: 'a' }, { key: 'b' }], 3, 560, 260);
    finite(scene);
    expect(scene.marks[1]!.value).toBe(scene.marks[2]!.value);
    expect(scene.marks[0]!.related).toContain(scene.marks[1]!.id);
    expect(scene.headline).toBeNull();
  });
  it('orders trails by time, keeps original identities and breaks at missing coordinates', () => {
    const data = [
      { id: 'late', group: 'A', order: 2, x: 5, y: 5 },
      { id: 'early', group: 'A', order: 0, x: 1, y: 2 },
      { id: 'middle', group: 'A', order: 1, x: 3, y: 4 },
    ];
    const segments = scatterTrails(data);
    expect(segments.map(([a, b]) => [a.id, b.id])).toEqual([
      ['early', 'middle'],
      ['middle', 'late'],
    ]);
    expect(segments[0]![0]).toBe(data[1]);
    expect(
      scatterTrails(data.map((r) => (r.id === 'middle' ? { ...r, x: null } : r))),
    ).toHaveLength(0);
    expect(scatterTrails([...data, { ...data[0]!, id: 'duplicate' }])).toHaveLength(0);
  });
  it('drills a treemap group and returns through its breadcrumb without changing leaf pinning', async () => {
    const data = [
      { group: 'A', name: 'One', value: 10 },
      { group: 'A', name: 'Two', value: 20 },
      { group: 'B', name: 'Three', value: 30 },
    ];
    const view = await mount(
      <TreemapChartCard
        data={data}
        label="name"
        value="value"
        group="group"
        drilldown
        motion="none"
      />,
    );
    try {
      expect(marks(view.host)).toHaveLength(3);
      const open = [...view.host.querySelectorAll('nav button')].find(
        (b) => b.textContent === 'Open A',
      )!;
      await act(async () => (open as HTMLButtonElement).click());
      expect(marks(view.host)).toHaveLength(2);
      await act(async () => marks(view.host)[0]!.click());
      expect(marks(view.host)[0]!.getAttribute('aria-pressed')).toBe('true');
      await act(async () => (view.host.querySelector('nav button') as HTMLButtonElement).click());
      expect(marks(view.host)).toHaveLength(3);
    } finally {
      view.close();
    }
  });
  it('indexes the original measurements and reports a unitless latest headline', async () => {
    const view = await mount(
      <LineChartCard
        data={rows}
        x="x"
        series={[{ key: 'a' }, { key: 'b' }]}
        indexed
        motion="none"
      />,
    );
    try {
      await act(async () => vi.advanceTimersByTime(400));
      expect(view.host.querySelector('.lilt-card__value')?.textContent).toContain('33.3');
      const slider = view.host.querySelector('input[type="range"]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          slider,
          '0',
        );
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(view.host.querySelector('.lilt-card__value')?.textContent).toContain('100');
      expect(rows[0]!.a).toBe(30);
    } finally {
      view.close();
    }
  });
  it.each([LineChartCard, AreaChartCard])(
    'draws both supplied forecast envelopes with accessible field labels',
    async (Component) => {
      const data = [
        { x: 0, value: 10, l95: null, h95: null, l80: null, h80: null },
        { x: 1, value: 12, l95: 8, h95: 16, l80: 10, h80: 14 },
        { x: 2, value: 14, l95: 6, h95: 22, l80: 11, h80: 17 },
      ];
      const view = await mount(
        <Component
          data={data}
          x="x"
          series={[{ key: 'value' }]}
          forecast={{
            from: 1,
            bands: [
              { lower: 'l95', upper: 'h95', label: '95%' },
              { lower: 'l80', upper: 'h80', label: '80%' },
            ],
          }}
          hover="tooltip"
          motion="none"
        />,
      );
      try {
        await act(async () => vi.advanceTimersByTime(400));
        expect(view.host.querySelectorAll('.lilt-chart__interval-band')).toHaveLength(2);
        const slider = view.host.querySelector('input[type="range"]')!;
        await act(async () => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
            slider,
            '1',
          );
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => vi.advanceTimersByTime(100));
        expect(view.host.textContent).toContain('95% low');
        expect(view.host.textContent).toContain('80% high');
        expect(view.host.querySelector('.lilt-card__value')?.textContent).toContain('10');
      } finally {
        view.close();
      }
    },
  );
  it('uses the existing ranking pin and signed geometry for lollipops', async () => {
    const view = await mount(
      <HorizontalBarChartCard
        data={[
          { name: 'Gain', value: 5 },
          { name: 'Loss', value: -5 },
        ]}
        category="name"
        value="value"
        barStyle="lollipop"
        motion="none"
      />,
    );
    try {
      expect(view.host.querySelector('.lilt-list__rows')?.getAttribute('data-style')).toBe(
        'lollipop',
      );
      expect(view.host.querySelectorAll('.lilt-list__bar[data-negative]')).toHaveLength(1);
      const row = view.host.querySelector<HTMLButtonElement>('.lilt-list__row')!;
      await act(async () => row.click());
      expect(row.getAttribute('aria-pressed')).toBe('true');
    } finally {
      view.close();
    }
  });
});
