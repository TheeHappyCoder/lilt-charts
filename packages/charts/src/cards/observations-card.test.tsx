// @vitest-environment jsdom
import { act, cloneElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TreemapChartCard } from './treemap-chart-card';
import { CalendarHeatmapCard } from './calendar-heatmap-card';
import { SkylineCard, skylineLayout } from './skyline-card';
import { BlockCityCard, blockCityLayout } from './block-city-card';
import { RidgelineCard, ridgelineLayout } from './ridgeline-card';
import { SpiralYearCard, spiralLayout } from './spiral-year-card';
import { TerrainCard, terrainLayout } from './terrain-card';
import { HexCityCard, hexCityLayout } from './hex-city-card';
import { VoxelWaffleCard, allocateUnits, voxelLayout } from './voxel-waffle-card';
import { Prism, PrismSkeleton, prismOutline, visibleFaces } from './prism';
import { TimelineChartCard } from './timeline-chart-card';
import { StripChartCard } from './strip-chart-card';
import { SKELETON_EXIT_MS } from '../lifecycle/skeleton-exit';
import type { ObservationsCardProps } from './observations-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const rows = [
  { label: 'A', group: 'Team', date: '2024-01-01', start: 0, end: 100, value: 12 },
  { label: 'B', group: 'Team', date: '2024-01-02', start: 100, end: 220, value: 18 },
];
const terrainRows = [...rows, ...rows.map((row) => ({ ...row, group: 'Other team' }))];
const families = [
  ['treemap', <TreemapChartCard data={rows} label="label" value="value" group="group" />],
  ['calendar', <CalendarHeatmapCard data={rows} date="date" value="value" />],
  ['skyline', <SkylineCard data={rows} date="date" value="value" />],
  ['block city', <BlockCityCard data={rows} x="label" y="group" value="value" />],
  ['ridgeline', <RidgelineCard data={rows} series="group" x="label" value="value" />],
  ['spiral', <SpiralYearCard data={rows} date="date" value="value" />],
  ['terrain', <TerrainCard data={terrainRows} x="label" y="group" value="value" />],
  ['hex city', <HexCityCard data={rows} label="label" value="value" arrange="order" />],
  ['voxel waffle', <VoxelWaffleCard data={rows} category="label" value="value" units={2} />],
  [
    'timeline',
    <TimelineChartCard data={rows} label="label" start="start" end="end" lane="group" />,
  ],
  ['strip', <StripChartCard data={rows} category="group" label="label" value="value" />],
  [
    'beeswarm',
    <StripChartCard data={rows} category="group" label="label" value="value" display="beeswarm" />,
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
    height: 260,
    top: 0,
    left: 0,
    bottom: 260,
    right: 560,
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

async function mount(
  element: ReactElement,
  props: Partial<ObservationsCardProps<(typeof rows)[number]>> = {},
) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (next: typeof props) =>
    act(async () =>
      root.render(cloneElement(element as ReactElement<typeof props>, { ...props, ...next })),
    );
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
  ...host.querySelectorAll<HTMLButtonElement>('.lilt-observations-card__mark'),
];

it.each([{ from: '2026-10-01' }, { to: '2026-10-31' }])(
  'renders a calendar skeleton with only one date bound: %o',
  async (bounds) => {
    const view = await mount(
      <CalendarHeatmapCard data={rows} date="date" value="value" {...bounds} loading />,
    );
    try {
      expect(
        view.host.querySelectorAll('.lilt-observations-card__skeleton').length,
      ).toBeGreaterThan(0);
      expect(marks(view.host)).toHaveLength(0);
    } finally {
      view.close();
    }
  },
);

describe.each(families)('%s observation card', (_name, element) => {
  const familyRows = element.props.data;
  it.each(['shimmer', 'draw', 'breathe'] as const)(
    'holds the %s skeleton through its opacity exit before showing data',
    async (loadingStyle) => {
      const view = await mount(element, { loading: true, loadingStyle, depth: true });
      try {
        expect(view.host.querySelector('.lilt-skeleton')?.getAttribute('data-style')).toBe(
          loadingStyle,
        );
        expect(view.host.querySelector('.lilt-skeleton[data-depth]')).not.toBeNull();
        const skeleton = view.host.querySelector('.lilt-skeleton');
        expect(marks(view.host)).toHaveLength(0);
        expect(view.host.querySelector('.lilt-card__value')?.textContent).not.toMatch(/\d/);
        await view.render({ loading: false });
        expect(view.host.querySelector('[data-skeleton-leaving]')).not.toBeNull();
        expect(view.host.querySelector('.lilt-skeleton')).toBe(skeleton);
        expect(marks(view.host)).toHaveLength(0);
        await act(async () => vi.advanceTimersByTime(SKELETON_EXIT_MS + 1));
        expect(view.host.querySelector('.lilt-skeleton')).toBeNull();
        expect(marks(view.host)).toHaveLength(familyRows.length);
        expect(view.host.querySelector('[aria-busy]')?.getAttribute('aria-busy')).toBe('false');
      } finally {
        view.close();
      }
    },
  );
  it('skips decorative transitions for reduced motion, keeps geometry identical with depth, and supports keyboard pin/release', async () => {
    const onSelectionChange = vi.fn();
    const view = await mount(element, { motion: 'none', loading: true, onSelectionChange });
    try {
      expect(view.host.querySelector('.lilt-skeleton[data-reduced-motion]')).not.toBeNull();
      expect(view.host.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
      await view.render({ loading: false });
      expect(view.host.querySelector('[data-skeleton-leaving]')).toBeNull();
      const positions = marks(view.host).map((mark) => [
        mark.style.left,
        mark.style.top,
        mark.style.width,
        mark.style.height,
      ]);
      await view.render({
        loading: false,
        depth: true,
        header: false,
        'aria-label': 'External title',
      });
      expect(
        marks(view.host).map((mark) => [
          mark.style.left,
          mark.style.top,
          mark.style.width,
          mark.style.height,
        ]),
      ).toEqual(positions);
      expect(view.host.querySelector('.lilt-card__header')).toBeNull();
      await act(async () => marks(view.host)[0]!.focus());
      await act(async () =>
        marks(view.host)[0]!.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        ),
      );
      expect(document.activeElement).toBe(marks(view.host)[1]);
      await act(async () => marks(view.host)[1]!.click());
      expect(marks(view.host)[1]?.getAttribute('aria-pressed')).toBe('true');
      expect(onSelectionChange.mock.lastCall?.[0]).toMatchObject({
        pinned: true,
        row: familyRows[1],
      });
      await act(async () =>
        marks(view.host)[1]!.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        ),
      );
      expect(marks(view.host)[1]?.getAttribute('aria-pressed')).toBe('false');
    } finally {
      view.close();
    }
  });
  it('retains accepted readings during refresh and can clear them when the new response is empty', async () => {
    const view = await mount(element, { motion: 'none' });
    try {
      expect(marks(view.host)).toHaveLength(familyRows.length);
      await view.render({ loading: true, data: [] });
      expect(marks(view.host)).toHaveLength(familyRows.length);
      expect(view.host.querySelector('.lilt-skeleton')).toBeNull();
      expect(view.host.textContent).toContain('Updating');
      await view.render({ loading: false, data: [] });
      expect(marks(view.host)).toHaveLength(0);
      expect(view.host.querySelector('.lilt-chart-empty')).not.toBeNull();
    } finally {
      view.close();
    }
  });
});

describe('skyline calendar', () => {
  const days = [
    { date: '2026-03-02', value: 0 },
    { date: '2026-03-03', value: 10 },
    { date: '2026-03-04', value: null },
    { date: '2026-03-05', value: 40 },
  ];
  const scene = (width = 560, height = 260) =>
    skylineLayout(days, 'date', 'value', width, height, {
      from: '2026-03-02',
      to: '2026-03-15',
      today: '2026-03-08',
    });

  it('stands each day up to its value and keeps every day on the floor', () => {
    const { marks: prisms } = scene();
    expect(prisms).toHaveLength(14);
    const lift = (id: string) => prisms.find((mark) => mark.id === id)!.prism!.lift;
    // Taller with more; a measured zero and an absent day both keep a slab; future days are flat.
    expect(lift('2026-03-05')).toBeGreaterThan(lift('2026-03-03'));
    expect(lift('2026-03-03')).toBeGreaterThan(lift('2026-03-02'));
    expect(lift('2026-03-04')).toBe(lift('2026-03-02'));
    expect(lift('2026-03-04')).toBeGreaterThan(0);
    expect(lift('2026-03-12')).toBe(0);
    expect(prisms.find((mark) => mark.id === '2026-03-04')).toMatchObject({ missing: true });
    expect(prisms.find((mark) => mark.id === '2026-03-12')).toMatchObject({ future: true });
    // Each box holds its footprint plus its lift, with the floor corner at the same place.
    for (const mark of prisms) {
      const { top, lift: h } = mark.prism!;
      expect(mark.height).toBeCloseTo(Math.max(...top.map(([, y]) => y)) + h);
    }
  });

  it('draws nearer days over farther ones and fits the card', () => {
    const { marks: prisms, width, height } = scene();
    const depth = (id: string) => prisms.find((mark) => mark.id === id)!.prism!.depth;
    // Later weekdays come toward the viewer; later weeks run away to the right and down.
    expect(depth('2026-03-03')).toBeGreaterThan(depth('2026-03-02'));
    expect(depth('2026-03-09')).toBeGreaterThan(depth('2026-03-02'));
    expect(width).toBe(560);
    expect(height).toBeLessThanOrEqual(260);
    for (const mark of prisms) {
      expect(mark.x).toBeGreaterThanOrEqual(0);
      expect(mark.x + mark.width).toBeLessThanOrEqual(560);
      expect(mark.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects the same rows the grid does', () => {
    expect(skylineLayout([...days, days[0]!], 'date', 'value', 560, 260).error).toMatch(/one row/);
  });
});

describe('cool chart layouts', () => {
  it('stands a block city up by value and keeps absent pairs on the floor', () => {
    const scene = blockCityLayout(
      [
        { region: 'North', month: 'Jan', sales: 10 },
        { region: 'North', month: 'Feb', sales: 40 },
        { region: 'South', month: 'Jan', sales: 0 },
      ],
      'month',
      'region',
      'sales',
      560,
      300,
    );
    expect(scene.marks.map((mark) => mark.id)).toEqual([
      'Jan · North',
      'Feb · North',
      'Jan · South',
      'Feb · South',
    ]);
    const lift = (id: string) => scene.marks.find((mark) => mark.id === id)!.prism!.lift;
    expect(lift('Feb · North')).toBeGreaterThan(lift('Jan · North'));
    expect(lift('Feb · South')).toBe(lift('Jan · South'));
    expect(scene.marks.find((mark) => mark.id === 'Feb · South')).toMatchObject({ missing: true });
    expect(scene.labels?.map((label) => label.text)).toEqual(['Jan', 'Feb', 'North', 'South']);
    expect(scene.height).toBeLessThanOrEqual(300);
  });

  it('draws ridges back to front and puts nearer hit areas in front', () => {
    const scene = ridgelineLayout(
      ['Mon', 'Tue'].flatMap((day) => [0, 1, 2].map((hour) => ({ day, hour, visits: hour * 10 }))),
      'day',
      'hour',
      'visits',
      560,
      300,
    );
    expect(scene.paths?.map((path) => path.id)).toEqual(['Mon', 'Tue']);
    const mon = scene.marks.filter((mark) => mark.group === 'Mon');
    const tue = scene.marks.filter((mark) => mark.group === 'Tue');
    expect(tue[0]!.layer).toBeGreaterThan(mon[0]!.layer!);
    // Taller values reach higher; each hit area runs down to its own baseline.
    expect(mon[2]!.y).toBeLessThan(mon[0]!.y);
    expect(mon[2]!.y + mon[2]!.height).toBeCloseTo(mon[0]!.y + mon[0]!.height);
    expect(scene.height).toBeLessThanOrEqual(300);
  });

  it('coils one turn per year with January at the top', () => {
    const days = Array.from({ length: 731 }, (_, index) => ({
      date: new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10),
      steps: index === 400 ? 9000 : 4000,
    }));
    const scene = spiralLayout(days, 'date', 'steps', 400, 400);
    expect(scene.marks).toHaveLength(731);
    const mark = (id: string) => scene.marks.find((item) => item.id === id)!;
    expect(mark('2024-01-01').rotate).toBeCloseTo(0);
    expect(mark('2025-01-01').rotate).toBeCloseTo(360);
    expect(mark('2024-07-02').rotate).toBeGreaterThan(178);
    expect(mark('2024-07-02').rotate).toBeLessThan(182);
    // The second turn sits further out, and a bigger day stands longer.
    const center = 200;
    const reach = (id: string) =>
      Math.hypot(mark(id).x + mark(id).width / 2 - center, mark(id).y + mark(id).height - center);
    expect(reach('2025-01-01')).toBeGreaterThan(reach('2024-01-01'));
    expect(mark(days[400]!.date).height).toBeGreaterThan(mark(days[401]!.date).height);
  });
});

describe('heavy 3D layouts', () => {
  it('serializes prism faces consistently across runtime trigonometry rounding', () => {
    const prism = {
      top: [
        [10, 0],
        [30, 8],
        [20, 20],
        [0, 12],
      ] as const,
      lift: 15,
      depth: 0,
      wave: 0,
    };
    const render = () =>
      renderToStaticMarkup(
        <>
          <Prism prism={prism} />
          <svg>
            <PrismSkeleton prism={prism} x={0} y={0} painted />
          </svg>
        </>,
      );
    const server = render();
    const atan2 = Math.atan2;
    vi.spyOn(Math, 'atan2').mockImplementation((y, x) => atan2(y, x) + 1e-15);
    expect(render()).toBe(server);
  });

  it('shows only the faces a viewer above and in front can see', () => {
    const square = {
      top: [
        [10, 0],
        [30, 8],
        [20, 20],
        [0, 12],
      ] as const,
      lift: 15,
      depth: 0,
      wave: 0,
    };
    const faces = visibleFaces(square);
    // The two front faces: the lit one turned left and the shaded one turned right.
    expect(faces).toHaveLength(2);
    expect(faces[0]!.shade).not.toBeCloseTo(faces[1]!.shade);
    expect(Math.max(...prismOutline(square).map(([, y]) => y))).toBe(35);
  });

  it('puts the largest hexagon in the middle and paints nearer hexagons last', () => {
    const scene = hexCityLayout(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((label, index) => ({ label, value: index + 1 })),
      'label',
      'value',
      560,
      320,
    );
    expect(scene.marks).toHaveLength(7);
    const g = scene.marks.find((mark) => mark.id === 'g')!;
    const a = scene.marks.find((mark) => mark.id === 'a')!;
    expect(g.prism!.lift).toBeGreaterThan(a.prism!.lift);
    expect(g.prism!.wave).toBe(0);
    expect(g.prism!.top).toHaveLength(6);
    const depths = scene.marks.map((mark) => mark.prism!.depth);
    expect(new Set(depths).size).toBe(7);
    expect(scene.height).toBeLessThanOrEqual(320);
  });

  it('allocates whole cubes that add up exactly and fills from the floor up', () => {
    expect(allocateUnits([1, 1, 1], 100)).toEqual([34, 33, 33]);
    const scene = voxelLayout(
      [
        { team: 'Design', hours: 50 },
        { team: 'Build', hours: 30 },
        { team: 'Test', hours: 20 },
      ],
      'team',
      'hours',
      560,
      320,
    );
    expect(scene.marks).toHaveLength(100);
    expect(scene.marks.filter((mark) => mark.group === 'Design')).toHaveLength(50);
    // Cube 75 sits in the same column as cube 0, three layers up.
    expect(scene.marks[0]!.y).toBeGreaterThan(scene.marks[75]!.y);
    expect(scene.marks[75]!.x).toBeCloseTo(scene.marks[0]!.x);
    expect(scene.readings?.map((row) => row.id)).toEqual(['Design', 'Build', 'Test']);
  });

  it('builds a lit surface through every reading that grows from a flat floor', () => {
    const scene = terrainLayout(
      ['Mon', 'Tue', 'Wed'].flatMap((day, j) =>
        ['06', '12', '18'].map((hour, i) => ({ day, hour, load: i === 1 && j === 1 ? 90 : 10 })),
      ),
      'hour',
      'day',
      'load',
      560,
      320,
      { smoothing: 2 },
    );
    expect(scene.marks).toHaveLength(9);
    expect(scene.paths).toHaveLength(16);
    expect(scene.paths!.every((path) => path.from && path.from !== path.d)).toBe(true);
    // The peak's pin stands highest.
    const peak = scene.marks.find((mark) => mark.id === '12 · Tue')!;
    expect(Math.min(...scene.marks.map((mark) => mark.y))).toBe(peak.y);
    expect(scene.height).toBeLessThanOrEqual(320);
  });
});
