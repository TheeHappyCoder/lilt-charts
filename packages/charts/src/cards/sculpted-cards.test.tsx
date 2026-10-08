// @vitest-environment jsdom
import { act, cloneElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChordLoomCard, chordLoomLayout } from './chord-loom-card';
import { ArcBridgesCard, arcBridgesLayout } from './arc-bridges-card';
import { RankRibbonsCard, rankRibbonsLayout } from './rank-ribbons-card';
import { ParallelRibbonsCard, parallelRibbonsLayout } from './parallel-ribbons-card';
import { EventHelixCard, eventHelixLayout } from './event-helix-card';
import { ContourIslandsCard, contourIslandsLayout } from './contour-islands-card';
import { densityContours } from './density-contours';
import type { ObservationsCardProps, ObservationScene } from './observations-card';
import { SKELETON_EXIT_MS } from '../lifecycle/skeleton-exit';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const links = [
  { from: 'Design', to: 'Build', count: 20 },
  { from: 'Build', to: 'Review', count: 10 },
];
const scores = [
  { team: 'A', month: 'Jan', score: 10 },
  { team: 'B', month: 'Jan', score: 20 },
  { team: 'A', month: 'Feb', score: 30 },
  { team: 'B', month: 'Feb', score: 15 },
];
const profiles = [
  { name: 'A', speed: 5, quality: 80, cost: 40 },
  { name: 'B', speed: 9, quality: 40, cost: 25 },
];
const events = [
  { name: 'A', at: '2026-09-28T06:00:00Z', value: 10 },
  { name: 'B', at: '2026-09-29T06:00:00Z', value: 20 },
];
const cloud = [
  { name: 'A', x: 10, y: 30, weight: 1 },
  { name: 'B', x: 12, y: 34, weight: 2 },
  { name: 'C', x: 80, y: 75, weight: 1 },
];
const families = [
  ['chord', <ChordLoomCard data={links} source="from" target="to" value="count" />, 2],
  ['bridges', <ArcBridgesCard data={links} source="from" target="to" value="count" />, 2],
  ['ranks', <RankRibbonsCard data={scores} series="team" period="month" value="score" />, 4],
  [
    'parallel',
    <ParallelRibbonsCard data={profiles} label="name" metrics={['speed', 'quality', 'cost']} />,
    6,
  ],
  ['helix', <EventHelixCard data={events} label="name" date="at" value="value" />, 2],
  ['contours', <ContourIslandsCard data={cloud} label="name" x="x" y="y" />, 3],
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
        expect(skeleton?.querySelector('[data-skeleton]')).not.toBeNull();
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

describe('sculpted geometry', () => {
  it.each([chordLoomLayout, arcBridgesLayout])(
    'keeps zeros and missing flows in readings without drawing ribbons',
    (layout) => {
      const scene = layout(
        [
          ...links,
          { from: 'Review', to: 'Launch', count: 0 },
          { from: 'Launch', to: 'Design', count: null },
        ],
        'from',
        'to',
        'count',
        300,
        260,
      );
      expect(scene.marks).toHaveLength(2);
      expect(scene.readings).toHaveLength(4);
      finite(scene);
      expect(layout([...links, links[0]!], 'from', 'to', 'count', 560, 300).error).toMatch(/pair/);
      expect(
        layout([{ from: 'A', to: 'A', count: 1 }], 'from', 'to', 'count', 560, 300).error,
      ).toMatch(/differ/);
      expect(
        layout([{ from: 'A', to: 'B', count: -1 }], 'from', 'to', 'count', 560, 300).error,
      ).toMatch(/negative/);
    },
  );
  it('conserves chord node totals without double counting the headline readings', () => {
    const scene = chordLoomLayout(links, 'from', 'to', 'count', 560, 340);
    expect(scene.groups?.map((group) => group.value)).toEqual([20, 30, 10]);
    expect(scene.readings?.reduce((sum, row) => sum + (row.value ?? 0), 0)).toBe(30);
  });
  it('keeps delimiter-containing node names distinct', () => {
    const scene = arcBridgesLayout(
      [
        { a: 'A · B', b: 'C', v: 1 },
        { a: 'A', b: 'B · C', v: 2 },
      ],
      'a',
      'b',
      'v',
      560,
      300,
    );
    expect(new Set(scene.marks.map((mark) => mark.id)).size).toBe(2);
  });
  it('derives competition ranks and breaks tracks at missing periods', () => {
    const scene = rankRibbonsLayout(
      [...scores, { team: 'C', month: 'Jan', score: 20 }, { team: 'C', month: 'Feb', score: null }],
      'team',
      'month',
      'score',
      300,
      260,
    );
    expect(scene.marks.find((mark) => mark.label.startsWith('A · Jan'))?.label).toContain('Rank 3');
    expect(scene.marks.find((mark) => mark.label.startsWith('B · Jan'))?.label).toContain('Rank 1');
    expect(scene.marks.find((mark) => mark.label.startsWith('C · Jan'))?.label).toContain('Rank 1');
    expect(scene.marks.some((mark) => mark.label.startsWith('C · Feb'))).toBe(false);
    expect(scene.readings).toHaveLength(6);
    finite(scene);
    const gap = rankRibbonsLayout(
      [
        { name: 'A', period: '1', v: 2 },
        { name: 'A', period: '2', v: null },
        { name: 'A', period: '3', v: 8 },
      ],
      'name',
      'period',
      'v',
      560,
      260,
    );
    expect(gap.marks[1]!.width).toBeLessThan(30);
  });
  it('normalizes parallel axes separately, preserves constants and rejects invalid domains', () => {
    const scene = parallelRibbonsLayout(profiles, 'name', ['speed', 'quality', 'cost'], 300, 260);
    finite(scene);
    expect(scene.marks).toHaveLength(6);
    expect(parallelRibbonsLayout(profiles, 'name', ['speed'], 560, 300).error).toMatch(/two/);
    expect(
      parallelRibbonsLayout(profiles, 'name', ['speed', 'cost'], 560, 300, {
        domains: { speed: [0, Infinity] },
      }).error,
    ).toMatch(/finite/);
    finite(parallelRibbonsLayout([{ name: 'A', x: 5, y: 5 }], 'name', ['x', 'y'], 300, 260));
    const gap = parallelRibbonsLayout(
      [{ name: 'A', x: 1, y: null, z: 4 }],
      'name',
      ['x', 'y', 'z'],
      560,
      300,
    );
    expect(gap.marks).toHaveLength(2);
    expect(gap.marks[1]!.width).toBeLessThan(25);
  });
  it('lines up the same UTC time on successive helix turns and sorts unordered events', () => {
    const scene = eventHelixLayout([...events].reverse(), 'name', 'at', 'value', 560, 360);
    const centerX = (i: number) => scene.marks[i]!.x + scene.marks[i]!.width / 2;
    expect(centerX(0)).toBeCloseTo(centerX(1));
    expect(scene.marks[1]!.y).toBeLessThan(scene.marks[0]!.y);
    expect(scene.marks[1]!.width).toBeGreaterThan(scene.marks[0]!.width);
    finite(scene);
    expect(
      eventHelixLayout(
        [{ name: 'A', at: '2026-09-28T06:00:00', value: 1 }],
        'name',
        'at',
        'value',
        560,
        360,
      ).error,
    ).toMatch(/time zone/);
    expect(
      eventHelixLayout(
        [
          { name: 'A', at: '2026-01-01', value: 1 },
          { name: 'B', at: '2026-12-01', value: 1 },
        ],
        'name',
        'at',
        'value',
        560,
        360,
      ).error,
    ).toMatch(/60/);
  });
  it('extracts closed contours and keeps weighted observations separate from density estimates', () => {
    const rings = densityContours(
      [
        [0, 0, 0],
        [0, 2, 0],
        [0, 0, 0],
      ],
      1,
    );
    expect(rings).toHaveLength(1);
    expect(rings[0]![0]).toEqual(rings[0]!.at(-1));
    const scene = contourIslandsLayout(cloud, 'x', 'y', 'name', 300, 280, { weight: 'weight' });
    expect(scene.paths!.length).toBeGreaterThan(4);
    expect(scene.marks).toHaveLength(3);
    expect(scene.marks.map((mark) => mark.value)).toEqual([1, 2, 1]);
    finite(scene);
    const missing = contourIslandsLayout(
      [...cloud, { name: 'D', x: null, y: 10, weight: 3 }],
      'x',
      'y',
      'name',
      300,
      280,
    );
    expect(missing.marks).toHaveLength(3);
    expect(missing.readings).toHaveLength(4);
    finite(contourIslandsLayout([{ name: 'A', x: 5, y: 5 }], 'x', 'y', 'name', 300, 280));
  });
});
