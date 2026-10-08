// @vitest-environment jsdom
import { act, cloneElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservationsCardProps, ObservationScene } from './observations-card';
import { SKELETON_EXIT_MS } from '../lifecycle/skeleton-exit';
import { hierarchy } from './spatial-hierarchy';
import { packHierarchy } from './hierarchy-layouts';
import { SunburstTerracesCard, sunburstTerracesLayout } from './sunburst-terraces-card';
import { ClusterConstellationCard, clusterConstellationLayout } from './cluster-constellation-card';
import { TernaryPrismCard, ternaryPrismLayout } from './ternary-prism-card';
import { WindRoseCard, windRoseLayout } from './wind-rose-card';
import { MarimekkoBlocksCard, marimekkoBlocksLayout } from './marimekko-blocks-card';
import { IntersectionTowersCard, intersectionTowersLayout } from './intersection-towers-card';
import { HorizonFoldsCard, horizonFoldsLayout } from './horizon-folds-card';
import { CircleArchipelagoCard, circleArchipelagoLayout } from './circle-archipelago-card';
import { HelixRibbonsCard, helixRibbonsLayout } from './helix-ribbons-card';
import { VoxelCloudCard, voxelCloudLayout } from './voxel-cloud-card';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const tree = [
  { path: 'A/One', value: 9 },
  { path: 'A/Two', value: 4 },
  { path: 'B/Three', value: 16 },
];
const cloud = [
  { name: 'A', x: 0, y: 0, z: 0, value: 8, links: ['B'] },
  { name: 'B', x: 10, y: 20, z: 30, value: 27, links: [] },
  { name: 'C', x: 5, y: 5, z: 15, value: 1, links: [] },
];
const mix = [
  { name: 'A', a: 1, b: 1, c: 1, value: 10 },
  { name: 'B', a: 1, b: 0, c: 0, value: 20 },
];
const wind = [
  { direction: 0, band: 'Light', value: 10 },
  { direction: 0, band: 'Strong', value: 20 },
  { direction: 90, band: 'Light', value: 30 },
];
const markets = [
  { category: 'A', segment: 'X', value: 10 },
  { category: 'A', segment: 'Y', value: 20 },
  { category: 'B', segment: 'X', value: 30 },
];
const sets = [
  { sets: ['A'], value: 10 },
  { sets: ['B'], value: 20 },
  { sets: ['A', 'B'], value: 30 },
];
const signed = [
  { series: 'A', time: 0, value: -10 },
  { series: 'A', time: 1, value: 10 },
  { series: 'A', time: 2, value: 0 },
];
const cycles = [
  { series: 'A', cycle: 0, phase: 0, value: 10 },
  { series: 'A', cycle: 0, phase: 0.125, value: 20 },
  { series: 'A', cycle: 0, phase: 0.25, value: 30 },
];
const families = [
  ['sunburst', <SunburstTerracesCard data={tree} path="path" value="value" />, 5],
  ['archipelago', <CircleArchipelagoCard data={tree} path="path" value="value" />, 3],
  [
    'constellation',
    <ClusterConstellationCard
      data={cloud}
      label="name"
      x="x"
      y="y"
      z="z"
      value="value"
      connections="links"
    />,
    3,
  ],
  ['voxels', <VoxelCloudCard data={cloud} label="name" x="x" y="y" z="z" value="value" />, 3],
  ['ternary', <TernaryPrismCard data={mix} label="name" a="a" b="b" c="c" value="value" />, 2],
  ['wind', <WindRoseCard data={wind} direction="direction" band="band" value="value" />, 3],
  [
    'marimekko',
    <MarimekkoBlocksCard data={markets} category="category" segment="segment" value="value" />,
    3,
  ],
  ['intersections', <IntersectionTowersCard data={sets} members="sets" value="value" />, 3],
  ['horizon', <HorizonFoldsCard data={signed} series="series" time="time" value="value" />, 12],
  [
    'ribbons',
    <HelixRibbonsCard data={cycles} series="series" cycle="cycle" phase="phase" value="value" />,
    5,
  ],
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

describe('spatial encodings and data truth', () => {
  it('preserves numeric values alongside spatial context for assistive technology', async () => {
    const view = await mount(
      <VoxelCloudCard data={cloud} label="name" x="x" y="y" z="z" value="value" />,
      { motion: 'none' },
    );
    try {
      expect(marks(view.host)[0]?.getAttribute('aria-label')).toBe('A: 8 · x: 0 · y: 0 · z: 0');
      expect(view.host.querySelector('tbody td')?.textContent).toBe('8 · x: 0 · y: 0 · z: 0');
    } finally {
      view.close();
    }
  });

  it('keeps a deep hierarchy drawable in a short card and reports zero located compositions truthfully', () => {
    finite(
      sunburstTerracesLayout([{ path: 'A/B/C/D/E/F/G/H', value: 1 }], 'path', 'value', 280, 200, {
        rise: 24,
      }),
    );
    expect(
      ternaryPrismLayout(
        [{ name: 'A', a: 0, b: 0, c: 0, value: 20 }],
        'name',
        'a',
        'b',
        'c',
        'value',
        280,
        200,
      ).headline,
    ).toBe(0);
    expect(
      voxelCloudLayout(
        [{ name: 'A', x: null, y: 1, z: 1, value: 20 }],
        'name',
        'x',
        'y',
        'z',
        'value',
        280,
        200,
      ).headline,
    ).toBe(0);
  });
  it('sums hierarchy leaves once, preserves original leaf rows, and rejects ambiguous paths', () => {
    const scene = sunburstTerracesLayout(tree, 'path', 'value', 560, 360);
    finite(scene);
    expect(scene.headline).toBe(29);
    expect(scene.marks.find((m) => m.id === 'A')?.value).toBe(13);
    expect(scene.marks.find((m) => m.id === 'A/One')?.datum).toBe(tree[0]);
    expect(scene.marks.find((m) => m.id === 'A')?.datum).toBeNull();
    expect(hierarchy([...tree, { path: 'A', value: 13 }], 'path', 'value')).toMatch(/ancestor/);
    expect(hierarchy([tree[0]!, tree[0]!], 'path', 'value')).toMatch(/unique/);
    expect(hierarchy([{ path: 'A//B', value: 1 }], 'path', 'value')).toMatch(/segments/);
  });

  it('retains a common leaf area scale and packs every sibling without overlap', () => {
    const root = hierarchy(tree, 'path', 'value');
    if (typeof root === 'string') throw Error(root);
    const packed = packHierarchy(root, 0.7);
    const check = (node: typeof packed) => {
      for (const [i, a] of node.children.entries()) {
        expect(Math.hypot(a.x, a.y) + a.r).toBeLessThanOrEqual(node.r + 1e-6);
        for (const b of node.children.slice(i + 1))
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1e-6);
        check(a);
      }
    };
    check(packed);
    const scene = circleArchipelagoLayout(tree, 'path', 'value', 560, 360);
    finite(scene);
    const one = scene.marks.find((m) => m.id === 'A/One')!,
      two = scene.marks.find((m) => m.id === 'A/Two')!;
    expect(one.width ** 2 / two.width ** 2).toBeCloseTo(9 / 4, 8);
  });

  it('does not give missing or zero hierarchy leaves visible area', () => {
    const data = [
      { path: 'A/B', value: null },
      { path: 'A/C', value: 0 },
      { path: 'D', value: 12 },
    ];
    for (const layout of [sunburstTerracesLayout, circleArchipelagoLayout]) {
      const scene = layout(data, 'path', 'value', 560, 360);
      finite(scene);
      expect(scene.readings?.map((r) => r.value)).toEqual([null, 0, 12]);
      expect(scene.marks.map((m) => m.id)).toEqual(['D']);
    }
  });

  it('rotates XYZ coordinates, preserves values, and slices without rescaling surviving cubes', () => {
    const layout = (options = {}) =>
      voxelCloudLayout(cloud, 'name', 'x', 'y', 'z', 'value', 560, 360, options);
    const full = layout(),
      sliced = layout({ slice: [10, 20] }),
      rotated = layout({ yaw: 90 });
    finite(full);
    finite(sliced);
    finite(rotated);
    expect(sliced.marks).toHaveLength(1);
    expect(sliced.marks[0]).toEqual(full.marks[2]);
    expect(sliced.readings).toHaveLength(3);
    expect(sliced.readings?.[0]?.description).toContain('Outside slice');
    expect(rotated.marks[0]?.x).not.toBe(full.marks[0]?.x);
    expect(rotated.marks.map((m) => m.value)).toEqual(full.marks.map((m) => m.value));
    expect(layout({ slice: [20, 10] }).error).toMatch(/ascending/);
    expect(layout({ yaw: NaN, elevation: Infinity }).marks).toEqual(full.marks);
  });

  it('centres constant axes and supports huge finite coordinate domains without NaN', () => {
    const scene = voxelCloudLayout(
      [
        { name: 'A', x: -1e308, y: 2, z: 2, value: 1 },
        { name: 'B', x: 1e308, y: 2, z: 2, value: 1 },
      ],
      'name',
      'x',
      'y',
      'z',
      'value',
      560,
      360,
    );
    finite(scene);
    expect(scene.marks[0]?.x).not.toBe(scene.marks[1]?.x);
    expect(
      voxelCloudLayout([{ ...cloud[0]!, z: null }], 'name', 'x', 'y', 'z', 'value', 560, 360).marks,
    ).toHaveLength(0);
  });

  it('deduplicates undirected connections and validates their endpoints', () => {
    const graph = [cloud[0]!, { ...cloud[1]!, links: ['A'] }, cloud[2]!];
    const scene = clusterConstellationLayout(
      graph,
      'name',
      'x',
      'y',
      'z',
      'value',
      'links',
      560,
      360,
    );
    finite(scene);
    expect(scene.paths?.filter((p) => p.related)).toHaveLength(1);
    expect(scene.marks[1]?.related).toEqual(['A']);
    expect(
      clusterConstellationLayout(
        [{ ...cloud[0]!, links: ['Missing'] }],
        'name',
        'x',
        'y',
        'z',
        'value',
        'links',
        560,
        360,
      ).error,
    ).toMatch(/existing/);
  });

  it('keeps neighbours lit and unrelated nodes muted through keyboard pinning', async () => {
    const view = await mount(
      <ClusterConstellationCard
        data={cloud}
        label="name"
        x="x"
        y="y"
        z="z"
        value="value"
        connections="links"
      />,
      { motion: 'none' },
    );
    try {
      const [a, b, c] = marks(view.host);
      await act(async () => a!.click());
      expect(a?.getAttribute('aria-pressed')).toBe('true');
      expect(b?.hasAttribute('data-muted')).toBe(false);
      expect(c?.hasAttribute('data-muted')).toBe(true);
      expect(view.host.querySelectorAll('.lilt-observations-card__path[data-muted]')).toHaveLength(
        0,
      );
    } finally {
      view.close();
    }
  });

  it('normalizes ternary composition, preserves magnitude, and omits unlocatable rows', () => {
    const data = [
      { name: 'A', a: 1, b: 2, c: 3, value: 20 },
      { name: 'B', a: 10, b: 20, c: 30, value: 20 },
      { name: 'C', a: 0, b: 0, c: 0, value: 5 },
      { name: 'D', a: null, b: 1, c: 2, value: 5 },
    ];
    const scene = ternaryPrismLayout(data, 'name', 'a', 'b', 'c', 'value', 560, 340);
    finite(scene);
    expect(scene.marks).toHaveLength(2);
    expect(scene.marks[0]?.x).toBe(scene.marks[1]?.x);
    expect(scene.marks[0]?.y).toBe(scene.marks[1]?.y);
    expect(scene.marks[0]?.description).toContain('c: 50.0%');
    expect(scene.readings).toHaveLength(4);
    expect(ternaryPrismLayout(data, 'name', 'a', 'a', 'c', 'value', 560, 340).error).toMatch(
      /distinct/,
    );
  });

  const polygonArea = (points: readonly (readonly [number, number])[]) =>
    Math.abs(
      points.reduce((s, p, i) => {
        const q = points[(i + 1) % points.length]!;
        return s + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2;
  const ribbonArea = (path: string) =>
    polygonArea(
      [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [
        Number(m[1]),
        Number(m[2]),
      ]),
    );
  it('uses squared radius so wind petal areas match frequencies', () => {
    const scene = windRoseLayout(wind, 'direction', 'band', 'value', 560, 340);
    finite(scene);
    expect(ribbonArea(scene.marks[1]!.ribbon!) / ribbonArea(scene.marks[0]!.ribbon!)).toBeCloseTo(
      2,
      3,
    );
    expect(
      windRoseLayout(
        [{ direction: 20, band: 'Light', value: 2 }],
        'direction',
        'band',
        'value',
        560,
        340,
      ).error,
    ).toMatch(/centres/);
  });

  it('preserves Marimekko top area ratios across unequal categories', () => {
    const scene = marimekkoBlocksLayout(markets, 'category', 'segment', 'value', 560, 340);
    finite(scene);
    const areas = scene.marks.map((m) => polygonArea(m.prism!.top));
    expect(areas[1]! / areas[0]!).toBeCloseTo(2, 8);
    expect(areas[2]! / areas[0]!).toBeCloseTo(3, 8);
    expect(new Set(scene.marks.map((m) => m.prism!.lift)).size).toBe(1);
  });

  it('treats set membership order as identity and preserves an exclusive intersection row', () => {
    const scene = intersectionTowersLayout(sets, 'sets', 'value', 560, 340);
    finite(scene);
    expect(scene.marks[0]?.datum).toBe(sets[2]);
    expect(scene.marks[0]?.label).toBe('A ∩ B');
    expect(scene.paths?.filter((p) => p.related?.[0] === scene.marks[0]?.id)).toHaveLength(3);
    expect(
      intersectionTowersLayout(
        [
          { sets: ['A', 'B'], value: 10 },
          { sets: ['B', 'A'], value: 5 },
        ],
        'sets',
        'value',
        560,
        340,
      ).error,
    ).toMatch(/once/);
  });

  it('splits signed horizon crossings at zero and never bridges missing samples', () => {
    const scene = horizonFoldsLayout(signed, 'series', 'time', 'value', 560, 320);
    finite(scene);
    expect(scene.headline).toBe(0);
    const positive = scene.marks.filter((m) => m.description?.startsWith('Positive')),
      negative = scene.marks.filter((m) => m.description?.startsWith('Negative'));
    expect(positive.length).toBeGreaterThan(0);
    expect(negative.length).toBeGreaterThan(0);
    expect(positive[0]?.value).toBe(10);
    const gaps = horizonFoldsLayout(
      signed.map((r, i) => ({ ...r, value: i === 1 ? null : r.value })),
      'series',
      'time',
      'value',
      560,
      320,
    );
    expect(gaps.marks.filter((m) => m.shape === 'ribbon')).toHaveLength(0);
    expect(gaps.readings?.[1]?.value).toBeNull();
  });

  it('breaks helix ribbons at missing data and long gaps, and keeps every sample inspectable', () => {
    const layout = (
      data: readonly { series: string; cycle: number; phase: number; value: number | null }[],
    ) => helixRibbonsLayout(data, 'series', 'cycle', 'phase', 'value', 560, 390);
    finite(layout(cycles));
    expect(layout(cycles).marks.filter((m) => m.shape === 'ribbon')).toHaveLength(2);
    expect(
      layout(cycles.map((r, i) => ({ ...r, value: i === 1 ? null : r.value }))).marks.filter(
        (m) => m.shape === 'ribbon',
      ),
    ).toHaveLength(0);
    expect(
      layout([cycles[0]!, { ...cycles[1]!, phase: 0.8 }]).marks.filter((m) => m.shape === 'ribbon'),
    ).toHaveLength(0);
    expect(layout([{ ...cycles[0]!, phase: 1 }]).error).toMatch(/phases/);
    expect(layout([cycles[0]!, { ...cycles[1]!, cycle: 30 }]).error).toMatch(/25/);
  });

  it.each(families)('renders %s deterministically for hydration', (_name, element) => {
    const original = Math.atan2;
    const first = renderToString(element);
    vi.spyOn(Math, 'atan2').mockImplementation((y, x) => original(y, x) + 1e-16);
    expect(renderToString(element)).toBe(first);
  });
});
