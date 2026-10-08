// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { RadialChartCard, ringAngles, ringScale, sliceAngles } from './radial-chart-card';
import { ProgressCard } from './progress-card';
import { StatCard } from './stat-card';
import { choosePeriod } from '../test-utils/choose-period';
import { manualFrames } from '../test-utils/manual-frames';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const channels = [
  { channel: 'Email', revenue: 20 as number | null },
  { channel: 'Organic', revenue: 50 },
  { channel: 'Direct', revenue: 30 },
  { channel: 'Referral', revenue: null },
];

async function render(element: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    rerender: async (next: React.ReactElement) => act(async () => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const text = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((node) => node.textContent);

describe('RadialChartCard', { timeout: 15_000 }, () => {
  it.each(['draw', 'breathe'] as const)(
    'loads each radial variant with %s in both flat and depth styles',
    async (loadingStyle) => {
      for (const depth of [false, true]) {
        for (const variant of ['donut', 'pie', 'semi', 'rings'] as const) {
          const { host, unmount } = await render(
            <RadialChartCard
              title="Revenue"
              data={channels}
              category="channel"
              value="revenue"
              variant={variant}
              depth={depth}
              loading
              loadingStyle={loadingStyle}
            />,
          );
          try {
            const loading = host.querySelector('.lilt-radial-card__svg .lilt-skeleton')!;
            expect(loading.getAttribute('data-style')).toBe(loadingStyle);
            expect(loading.getAttribute('style')).toContain('--lilt-skeleton-clock');
            expect(host.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
            expect(!!loading.querySelector('[data-lilt-loading-depth]')).toBe(depth);
            // Slices (or partial rings) move one after another, never as one block.
            const slices = [...loading.querySelectorAll('[data-skeleton]')];
            expect(slices).toHaveLength(variant === 'rings' ? 3 : 4);
            for (const slice of slices)
              expect(slice.getAttribute('data-skeleton')).toBe(depth ? 'bloom' : 'stroke');
            const steps = slices.map((slice) =>
              Number((slice as SVGElement).style.getPropertyValue('--lilt-skeleton-step')),
            );
            expect(steps).toEqual([...steps].sort((a, b) => a - b));
            expect(new Set(steps).size).toBe(steps.length);
            if (!depth)
              for (const slice of slices) expect(slice.getAttribute('pathLength')).toBe('1');
            const ids = [...host.querySelectorAll('[id]')].map((element) => element.id);
            expect(new Set(ids).size).toBe(ids.length);
            expect(host.querySelector('.lilt-radial-card__center')).toBeNull();
          } finally {
            unmount();
          }
        }
      }
    },
  );

  it.each(['draw', 'breathe'] as const)(
    'keeps %s radial placeholders complete under reduced motion',
    async (loadingStyle) => {
      const { host, unmount } = await render(
        <RadialChartCard
          motion="none"
          title="Revenue"
          data={channels}
          category="channel"
          value="revenue"
          depth
          loading
          loadingStyle={loadingStyle}
        />,
      );
      try {
        expect(
          host
            .querySelector('.lilt-radial-card__svg .lilt-skeleton')
            ?.getAttribute('data-reduced-motion'),
        ).toBe('true');
        expect(host.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
        expect(host.querySelector('[data-lilt-loading-depth]')).not.toBeNull();
      } finally {
        unmount();
      }
    },
  );

  it.each(['donut', 'pie', 'semi', 'rings'] as const)(
    'loads the %s with its depth lighting and no visible readings',
    async (variant) => {
      const { host, unmount, rerender } = await render(
        <RadialChartCard
          motion="none"
          title="Revenue"
          data={channels}
          category="channel"
          value="revenue"
          variant={variant}
          depth
          loading
        />,
      );
      try {
        const skeleton = host.querySelector('[data-lilt-loading-depth]')!;
        expect(skeleton).not.toBeNull();
        expect(skeleton.querySelector('feDropShadow')).not.toBeNull();
        if (variant === 'pie') expect(skeleton.querySelector('radialGradient')).not.toBeNull();
        else
          expect(skeleton.querySelectorAll('.lilt-radial-card__tube-layer').length).toBeGreaterThan(
            10,
          );
        expect(host.querySelector('.lilt-radial-card__center')).toBeNull();
        expect(host.querySelector('.lilt-card__value')?.textContent).not.toContain('100');
        expect(host.querySelector('.lilt-chart__skeleton-sheen')).toBeNull();
        await rerender(
          <RadialChartCard
            motion="none"
            title="Revenue"
            data={channels}
            category="channel"
            value="revenue"
            variant={variant}
            depth
          />,
        );
        expect(host.querySelector('[data-lilt-loading-depth]')).toBeNull();
        expect(host.querySelector('.lilt-card__value')?.textContent).toContain('100');
      } finally {
        unmount();
      }
    },
  );

  it('uses a separate shimmer silhouette so depth loading never duplicates SVG ids', async () => {
    const { host, unmount } = await render(
      <RadialChartCard
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
        depth
        loading
      />,
    );
    try {
      const ids = [...host.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(host.querySelectorAll('[data-lilt-loading-depth]')).toHaveLength(1);
      expect(host.querySelector('.lilt-chart__skeleton-sheen')).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('draws observed slices, lists every row, and centers the leading share', async () => {
    const { host, unmount } = await render(
      <RadialChartCard
        motion="none"
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('100');
      expect(host.querySelectorAll('.lilt-radial-card__slice')).toHaveLength(3);
      expect(text(host, '.lilt-radial-card__label')).toEqual([
        'Organic',
        'Direct',
        'Email',
        'Referral',
      ]);
      expect(text(host, '.lilt-radial-card__share')).toEqual(['50%', '30%', '20%', '—']);
      expect(host.querySelector('.lilt-radial-card__center')?.textContent).toBe('50%Organic');
    } finally {
      unmount();
    }
  });

  it('reads a hovered slice in the headline and the center', async () => {
    const { host, unmount } = await render(
      <RadialChartCard
        motion="none"
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
      />,
    );
    try {
      const direct = host.querySelector('.lilt-radial-card__hit[data-category="Direct"]')!;
      const hitShape = direct.getAttribute('d');
      await act(async () => {
        direct.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('30');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Direct · 30%');
      expect(host.querySelector('.lilt-radial-card__center')?.textContent).toBe('30%Direct');
      expect(host.querySelectorAll('.lilt-radial-card__slice[data-muted]')).toHaveLength(2);
      expect(host.querySelector('li[data-active]')?.textContent).toContain('Direct');
      // Hovering grows the drawn slice but never its hover target, so the pointer can't be
      // pushed out and back in at the edge.
      expect(direct.getAttribute('d')).toBe(hitShape);
      expect(
        host.querySelector('.lilt-radial-card__slice[data-category="Direct"]')?.getAttribute('d'),
      ).toBe(hitShape);
    } finally {
      unmount();
    }
  });

  it('folds categories past the limit into one gray Other slice', async () => {
    const data = 'abcdefg'.split('').map((name, index) => ({ name, value: 70 - index * 10 }));
    const { host, unmount } = await render(
      <RadialChartCard motion="none" title="T" data={data} category="name" value="value" />,
    );
    try {
      const labels = text(host, '.lilt-radial-card__label');
      expect(labels).toEqual(['a', 'b', 'c', 'd', 'e', 'Other']);
      // f and g: 20 + 10.
      expect(text(host, '.lilt-radial-card__value').at(-1)).toBe('30');
      const other = host.querySelectorAll<SVGPathElement>('.lilt-radial-card__slice')[5]!;
      expect(other.style.fill).toBe('var(--lilt-reference)');
    } finally {
      unmount();
    }
  });

  it('refuses negative values instead of drawing a misleading circle', async () => {
    const { host, unmount } = await render(
      <RadialChartCard
        motion="none"
        title="T"
        data={[
          { name: 'a', value: 5 },
          { name: 'b', value: -2 },
        ]}
        category="name"
        value="value"
      />,
    );
    try {
      expect(host.querySelector('.lilt-chart__status')?.textContent).toContain('negative');
      expect(host.querySelector('.lilt-radial-card__slice')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('keeps each category’s color when a new period re-ranks it', async () => {
    const color = (host: HTMLElement, id: string) =>
      host.querySelector<SVGPathElement>(`.lilt-radial-card__slice[data-category="${id}"]`)!.style
        .fill;
    const first = [
      { name: 'a', value: 30 },
      { name: 'b', value: 20 },
    ];
    const second = [
      { name: 'a', value: 10 },
      { name: 'b', value: 40 },
    ];
    const card = (data: typeof first) => (
      <RadialChartCard motion="none" title="T" data={data} category="name" value="value" />
    );
    const { host, rerender, unmount } = await render(card(first));
    try {
      const before = [color(host, 'a'), color(host, 'b')];
      await rerender(card(second));
      expect(text(host, '.lilt-radial-card__label')).toEqual(['b', 'a']);
      expect([color(host, 'a'), color(host, 'b')]).toEqual(before);
    } finally {
      unmount();
    }
  });

  it('draws one ring per category and a half ring for semi, with their legends', async () => {
    const rings = await render(
      <RadialChartCard
        motion="none"
        title="T"
        data={channels}
        category="channel"
        value="revenue"
        variant="rings"
      />,
    );
    try {
      expect(rings.host.querySelectorAll('.lilt-radial-card__ring')).toHaveLength(3);
      expect(rings.host.querySelectorAll('.lilt-radial-card__track')).toHaveLength(3);
      expect(rings.host.querySelector('.lilt-radial-card__key')?.getAttribute('data-variant')).toBe(
        'cards',
      );
    } finally {
      rings.unmount();
    }
    const semi = await render(
      <RadialChartCard
        motion="none"
        title="T"
        data={channels}
        category="channel"
        value="revenue"
        variant="semi"
      />,
    );
    try {
      expect(semi.host.querySelector('svg')?.getAttribute('viewBox')).toBe('-100 -100 200 104');
      expect(semi.host.querySelector('.lilt-radial-card__key')?.getAttribute('data-variant')).toBe(
        'inline',
      );
      expect(semi.host.querySelector('.lilt-radial-card__center')?.textContent).toBe('50%Organic');
    } finally {
      semi.unmount();
    }
  });

  it('measures slices and rings honestly', () => {
    const slices = sliceAngles([
      { id: 'a', label: 'a', value: 3 },
      { id: 'b', label: 'b', value: null },
      { id: 'c', label: 'c', value: 1 },
    ]);
    expect(slices.map((slice) => slice.id)).toEqual(['a', 'c']);
    expect(slices[0]!.endAngle).toBeCloseTo(Math.PI * 1.5);
    expect(slices[1]!.endAngle).toBeCloseTo(Math.PI * 2);
    // The largest ring stops short of a full turn, on a scale shared by every ring.
    expect(ringScale(275)).toBe(300);
    expect(ringScale(1000)).toBe(1250);
    const rings = ringAngles([
      { id: 'a', label: 'a', value: 275 },
      { id: 'b', label: 'b', value: 150 },
    ]);
    expect(rings[0]!.endAngle / (Math.PI * 2)).toBeCloseTo(275 / 300);
    expect(rings[1]!.endAngle / (Math.PI * 2)).toBeCloseTo(150 / 300);
  });
});

describe('ProgressCard and the Stat card ring', { timeout: 15_000 }, () => {
  it('shows the value, the share of the goal, and keeps counting past it', async () => {
    const { host, rerender, unmount } = await render(
      <ProgressCard motion="none" title="Visitors" value={1260} target={2000} />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('1,260');
      const meter = host.querySelector('[role="meter"]')!;
      expect(meter.getAttribute('aria-label')).toBe('63% of goal, target 2,000');
      expect(host.querySelector('.lilt-progress__fill')).not.toBeNull();
      await rerender(<ProgressCard motion="none" title="Visitors" value={2540} target={2000} />);
      expect(meter.getAttribute('aria-label')).toBe('127% of goal, target 2,000');
      await rerender(<ProgressCard motion="none" title="Visitors" value={null} target={2000} />);
      expect(host.querySelector('.lilt-progress__fill')).toBeNull();
      expect(host.querySelector('.lilt-progress__center strong')?.textContent).toBe('—');
    } finally {
      unmount();
    }
  });

  it('swaps value, goal, and change with the period', async () => {
    const { host, unmount } = await render(
      <ProgressCard
        motion="none"
        title="Visitors"
        target={2000}
        ranges={[
          { id: 'week', label: 'Week', value: 1000, delta: 0.1 },
          { id: 'month', label: 'Month', value: 6000, target: 8000, delta: -0.2 },
        ]}
      />,
    );
    try {
      await choosePeriod(host, 'month');
      expect(host.querySelector('[role="meter"]')?.getAttribute('aria-label')).toBe(
        '75% of goal, target 8,000',
      );
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('-20.0%');
    } finally {
      unmount();
    }
  });

  it('puts a ring beside a stat value with the target as its caption', async () => {
    const { host, unmount } = await render(
      <StatCard
        motion="none"
        title="Goal"
        data={[
          { day: 'Mon', orders: 90 },
          { day: 'Tue', orders: 60 },
        ]}
        value="orders"
        chart="ring"
        target={100}
      />,
    );
    try {
      expect(host.querySelector('.lilt-stat__ring-label')?.textContent).toBe('150%');
      expect(host.querySelector('.lilt-stat__caption')?.textContent).toBe('Target 100');
      expect(host.querySelector('.lilt-chart__svg')).toBeNull();
    } finally {
      unmount();
    }
  });
});

describe('Depth on radial cards', { timeout: 15_000 }, () => {
  const fronts = (host: HTMLElement) =>
    [...host.querySelectorAll('.lilt-radial-card__slice')].map((node) => node.getAttribute('d'));

  it('lights every slice and ring inside the exact outline the flat chart draws', async () => {
    for (const variant of ['donut', 'pie', 'semi', 'rings'] as const) {
      const flat = await render(
        <RadialChartCard
          motion="none"
          title="Revenue"
          data={channels}
          category="channel"
          value="revenue"
          variant={variant}
        />,
      );
      const deep = await render(
        <RadialChartCard
          motion="none"
          title="Revenue"
          data={channels}
          category="channel"
          value="revenue"
          variant={variant}
          depth
        />,
      );
      try {
        // Depth lights each band from inside its own outline, never beyond it.
        const outlines = [...deep.host.querySelectorAll('.lilt-radial-card__tube-outline')];
        const flatShapes = [
          ...flat.host.querySelectorAll('.lilt-radial-card__slice, .lilt-radial-card__track'),
        ].map((node) => node.getAttribute('d'));
        if (variant === 'pie') {
          expect(
            [...deep.host.querySelectorAll('.lilt-radial-card__dome')].map((node) =>
              node.getAttribute('d'),
            ),
          ).toEqual(fronts(flat.host));
        } else {
          expect(outlines.length).toBeGreaterThan(0);
          for (const outline of outlines) expect(flatShapes).toContain(outline.getAttribute('d'));
        }
        // Every clip resolves: category names can hold spaces, which break url(#id).
        for (const node of deep.host.querySelectorAll('[clip-path]'))
          expect(node.getAttribute('clip-path')).toMatch(/^url\(#[^\s)]+\)$/);
      } finally {
        flat.unmount();
        deep.unmount();
      }
    }
  });

  it('dims every lit slice but the one read in the headline', async () => {
    const { host, unmount } = await render(
      <RadialChartCard
        motion="none"
        title="Revenue"
        data={channels}
        category="channel"
        value="revenue"
        depth
      />,
    );
    try {
      const hit = host.querySelector('.lilt-radial-card__hit[data-category="Organic"]')!;
      await act(async () => {
        hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      const slices = [...host.querySelectorAll('g.lilt-radial-card__slice')];
      expect(slices.filter((slice) => slice.hasAttribute('data-muted'))).toHaveLength(
        slices.length - 1,
      );
    } finally {
      unmount();
    }
  });

  it('gives progress rings and stat meters depth without changing what they measure', async () => {
    const progress = await render(
      <ProgressCard motion="none" title="Visitors" value={1260} target={2000} depth />,
    );
    const meter = await render(
      <StatCard
        motion="none"
        title="Revenue"
        data={[{ day: 'Mon', revenue: 60 }]}
        value="revenue"
        x="day"
        chart="meter"
        target={80}
        depth
      />,
    );
    try {
      // A grooved track and a lit tube, each drawn in layers that share the flat ring's circle.
      const circles = [...progress.host.querySelectorAll('circle.lilt-progress__fill')];
      expect(circles.length).toBeGreaterThan(8);
      expect(new Set(circles.map((circle) => circle.getAttribute('r'))).size).toBe(1);
      expect(progress.host.querySelector('[role="meter"]')?.getAttribute('aria-label')).toContain(
        '63%',
      );
      const fill = meter.host.querySelector<HTMLElement>('.lilt-stat__block-fill')!;
      expect(fill.style.width).toBe('75%');
      expect(fill.hasAttribute('data-full')).toBe(false);
      expect(meter.host.querySelector('.lilt-stat__cells')).toBeNull();
    } finally {
      progress.unmount();
      meter.unmount();
    }
  });
});

describe('RadialChartCard with a selection you own', { timeout: 15_000 }, () => {
  const severities = [
    { severity: 'Critical', count: 87 },
    { severity: 'Urgent', count: 63 },
    { severity: 'Advisory', count: 39 },
  ];
  const colors = { Critical: '#ef4444', Urgent: '#f97316', Advisory: '#f59e0b' };
  const fill = (host: HTMLElement, id: string) =>
    host.querySelector<SVGPathElement>(`.lilt-radial-card__slice[data-category="${id}"]`)!.style
      .fill;

  it('shares one selection between outside controls and the chart', async () => {
    const requests: (string | null)[] = [];
    const card = (selected: string | null, data = severities) => (
      <RadialChartCard
        motion="none"
        title="Alarms"
        data={data}
        category="severity"
        value="count"
        colors={colors}
        selected={selected}
        onSelectedChange={(next) => requests.push(next)}
        center={({ category, value, pinned }) => (
          <b data-pinned={pinned || undefined}>
            {category} {value}
          </b>
        )}
      />
    );
    const { host, rerender, unmount } = await render(card('Urgent'));
    try {
      // An outside control chose Urgent: the chart shows it pinned, in its own color.
      expect(host.querySelector('.lilt-radial-card__center b')?.textContent).toBe('Urgent 63');
      expect(host.querySelector('.lilt-radial-card__center b[data-pinned]')).not.toBeNull();
      expect(host.querySelectorAll('.lilt-radial-card__slice[data-muted]')).toHaveLength(2);
      expect(fill(host, 'Critical')).toBe('#ef4444');

      // A click on a slice asks the owner; nothing changes until the owner agrees.
      const critical = host.querySelector('.lilt-radial-card__hit[data-category="Critical"]')!;
      await act(async () => {
        critical.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(requests).toEqual(['Critical']);
      expect(host.querySelector('.lilt-radial-card__center b')?.textContent).toBe('Urgent 63');
      await rerender(card('Critical'));
      expect(host.querySelector('.lilt-radial-card__center b')?.textContent).toBe('Critical 87');

      // Clicking the pinned slice asks to clear it; null clears the pin.
      await act(async () => {
        critical.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(requests.at(-1)).toBeNull();
      await rerender(card(null));
      expect(host.querySelector('.lilt-radial-card__center b[data-pinned]')).toBeNull();
      expect(host.querySelectorAll('.lilt-radial-card__slice[data-muted]')).toHaveLength(0);

      // New values re-rank the slices, but the pin and every color follow the category.
      await rerender(
        card('Advisory', [
          { severity: 'Advisory', count: 120 },
          { severity: 'Critical', count: 10 },
          { severity: 'Urgent', count: 5 },
        ]),
      );
      expect(host.querySelector('.lilt-radial-card__center b')?.textContent).toBe('Advisory 120');
      expect(fill(host, 'Critical')).toBe('#ef4444');
      expect(fill(host, 'Advisory')).toBe('#f59e0b');

      // A selection that left the data shows nothing pinned and asks the owner to clear it.
      requests.length = 0;
      await rerender(card('Advisory', severities.slice(0, 2)));
      expect(host.querySelector('.lilt-radial-card__center b[data-pinned]')).toBeNull();
      expect(requests).toEqual([null]);
    } finally {
      unmount();
    }
  });

  it('keeps its own pin when the selection is left out', async () => {
    const requests: (string | null)[] = [];
    const { host, unmount } = await render(
      <RadialChartCard
        motion="none"
        title="Alarms"
        data={severities}
        category="severity"
        value="count"
        onSelectedChange={(next) => requests.push(next)}
      />,
    );
    try {
      const urgent = host.querySelector('.lilt-radial-card__hit[data-category="Urgent"]')!;
      await act(async () => {
        urgent.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(requests).toEqual(['Urgent']);
      expect(host.querySelector('.lilt-radial-card__center')?.textContent).toBe('33%Urgent');
    } finally {
      unmount();
    }
  });
});

describe('embedded radial cards', () => {
  it.each(['list', 'inline', 'tiles', 'pills', 'bars', false] as const)(
    'requests one Escape release with legend=%s, awaiting the controlled owner',
    async (legend) => {
      const requests: (string | null)[] = [];
      const card = (selected: string | null) => (
        <RadialChartCard
          aria-label="Channel share"
          header={false}
          legend={legend}
          surface="ghost"
          data={channels}
          category="channel"
          value="revenue"
          motion="none"
          selected={selected}
          onSelectedChange={(value) => requests.push(value)}
          center={({ category, pinned }) => <b data-pinned={pinned}>{category}</b>}
        />
      );
      const { host, rerender, unmount } = await render(card('Direct'));
      try {
        const target = host.querySelector<HTMLElement>(
          legend === false ? '.lilt-radial-card__graphic' : '.lilt-radial-card__body button',
        )!;
        await act(async () =>
          target.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
          ),
        );
        expect(requests).toEqual([null]);
        expect(host.querySelector('.lilt-radial-card__center b')?.getAttribute('data-pinned')).toBe(
          'true',
        );
        await rerender(card(null));
        expect(host.querySelector('.lilt-radial-card__center b')?.getAttribute('data-pinned')).toBe(
          'false',
        );
        expect(host.querySelector('.lilt-card__header')).toBeNull();
        expect(host.querySelector('section')?.getAttribute('aria-label')).toBe('Channel share');
        if (legend === false)
          expect(host.querySelector('.lilt-radial-card__body button')).toBeNull();
      } finally {
        unmount();
      }
    },
  );

  it('inspects and pins by keyboard without a legend, and hides readings while loading', async () => {
    const requests: (string | null)[] = [];
    const card = (loading = false) => (
      <RadialChartCard
        aria-label="Channel share"
        header={false}
        legend={false}
        surface="ghost"
        data={channels}
        category="channel"
        value="revenue"
        motion="none"
        loading={loading}
        onSelectedChange={(value) => requests.push(value)}
        center={({ category, pinned }) => <b data-pinned={pinned}>{category}</b>}
      />
    );
    const { host, rerender, unmount } = await render(card());
    try {
      const graphic = host.querySelector<HTMLElement>('.lilt-radial-card__graphic')!;
      const key = async (key: string) =>
        act(async () => {
          graphic.dispatchEvent(
            new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
          );
        });
      await act(async () => graphic.focus());
      expect(document.activeElement).toBe(graphic);
      await key('ArrowRight');
      expect(graphic.getAttribute('aria-label')).toContain('Direct, 30');
      await key('Enter');
      expect(requests).toEqual(['Direct']);
      await key('Escape');
      expect(requests).toEqual(['Direct', null]);
      await key('End');
      expect(graphic.getAttribute('aria-label')).toContain('Referral, No data');
      await key('Home');
      await key(' ');
      expect(requests.at(-1)).toBe('Organic');
      expect(host.querySelector('table')?.textContent).toContain('ReferralNo data');
      expect(
        host.querySelector('.lilt-radial-card__center')?.getAttribute('aria-hidden'),
      ).toBeNull();
      await rerender(card(true));
      expect(host.querySelector('table')).toBeNull();
      expect(host.querySelector('.lilt-radial-card__center')).toBeNull();
      expect(graphic.hasAttribute('tabindex')).toBe(false);
      expect(graphic.getAttribute('aria-label')).toBe('Channel share');
    } finally {
      unmount();
    }
  });
});

describe('RadialChartCard period motion', { timeout: 15_000 }, () => {
  it('collapses leaving slices and blurs new ones in, never flashing the end state', async () => {
    const before = [
      { channel: 'Search', revenue: 40 },
      { channel: 'Direct', revenue: 30 },
      { channel: 'Referral', revenue: 20 },
    ];
    const after = [
      { channel: 'Search', revenue: 50 },
      { channel: 'Direct', revenue: 20 },
      { channel: 'Partners', revenue: 30 },
    ];
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const card = (data: typeof before) => (
      <RadialChartCard title="Revenue" data={data} category="channel" value="revenue" />
    );
    const leaving = () => host.querySelectorAll('[data-lilt-leaving]').length;
    const blurred = (id: string) =>
      (
        host.querySelector<SVGPathElement>(`.lilt-radial-card__slice[data-category="${id}"]`)?.style
          .filter ?? ''
      ).startsWith('blur(');
    try {
      const step = manualFrames();
      await act(async () => root.render(card(before)));
      for (const at of [16, 400, 800, 1200, 1600]) await step(at);
      expect(leaving()).toBe(0);

      await step(2000);
      await act(async () => root.render(card(after)));
      // The very first frame after the change still shows Referral, collapsing from where it was.
      expect(leaving()).toBe(1);
      expect(blurred('Partners')).toBe(true);
      expect(blurred('Search')).toBe(false);
      // The spring itself runs on Motion's own frame loop, which this test cannot step; its
      // settling is checked in the browser.
    } finally {
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    }
  });
});
