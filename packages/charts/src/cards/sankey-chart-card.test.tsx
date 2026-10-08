// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SankeyChartCard, sankeyGraph } from './sankey-chart-card';
import { choosePeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

interface Flow {
  from: string;
  to: string;
  visitors: number | null;
}

// 1,000 visits split into Browse and Direct. Browse passes on 400 and loses 250 along the way;
// Direct → Exit was not measured.
const flows: Flow[] = [
  { from: 'Visits', to: 'Browse', visitors: 650 },
  { from: 'Visits', to: 'Direct', visitors: 350 },
  { from: 'Browse', to: 'Sign-up', visitors: 400 },
  { from: 'Direct', to: 'Sign-up', visitors: 100 },
  { from: 'Direct', to: 'Exit', visitors: null },
];

async function render(element: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    rerender: (next: React.ReactElement) => act(async () => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const headline = (host: HTMLElement) => host.querySelector('.lilt-card__value')?.textContent;
const caption = (host: HTMLElement) => host.querySelector('.lilt-card__caption')?.textContent;
const hover = (element: Element) =>
  act(async () => {
    element.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  });

describe('sankeyGraph', () => {
  const graph = (data: Flow[], conservation: 'loss' | 'strict' = 'loss') =>
    sankeyGraph<Flow>({ data, source: 'from', target: 'to', value: 'visitors', conservation });

  it('names steps from the rows and keeps unmeasured flows as null', () => {
    const result = graph(flows);
    expect(result.error).toBeNull();
    expect(result.graph!.nodes.map((node) => node.id)).toEqual([
      'Visits',
      'Browse',
      'Direct',
      'Sign-up',
      'Exit',
    ]);
    expect(result.graph!.links.at(-1)!.value).toBeNull();
    expect(result.graph!.losses.Browse).toBe(250);
  });

  it('explains flows it cannot draw', () => {
    expect(graph([...flows, flows[0]!]).error).toBe(
      'Visits → Browse appears twice; combine it into one row.',
    );
    expect(graph([...flows, { from: 'Sign-up', to: 'Visits', visitors: 5 }]).error).toBe(
      'The flows loop back on themselves; a Sankey needs every flow to move forward.',
    );
    expect(graph(flows.slice(0, 4), 'strict').error).toMatch(
      /^Browse passes on a different amount than it receives/,
    );
    expect(graph([{ from: 'Visits', to: '', visitors: 1 }]).error).toBe(
      'Every flow needs a source and a target.',
    );
  });
});

describe('SankeyChartCard', { timeout: 15_000 }, () => {
  const card = (
    props: Partial<React.ComponentProps<typeof SankeyChartCard<Flow, 'visitors'>>> = {},
  ) => (
    <SankeyChartCard
      motion="none"
      title="Visitor flow"
      data={flows}
      source="from"
      target="to"
      value="visitors"
      {...props}
    />
  );

  it('draws measured flows and every step, and says what is missing', async () => {
    const { host, unmount } = await render(card());
    try {
      expect(host.querySelectorAll('.lilt-sankey-card__flow')).toHaveLength(4);
      expect(host.querySelectorAll('.lilt-sankey-card__node')).toHaveLength(5);
      expect(headline(host)).toContain('1,000');
      const labels = [...host.querySelectorAll('.lilt-sankey-card__label')].map((label) =>
        [...label.querySelectorAll('tspan')].map((span) => span.textContent).join(' '),
      );
      expect(labels).toEqual(['Visits 1,000', 'Browse 650', 'Direct 350', 'Sign-up 500', 'Exit —']);
      expect(host.querySelector('.lilt-sankey-card__footer')?.textContent).toBe(
        '1 flow isn’t measured yet and isn’t drawn; totals count measured flows only.',
      );
      const rows = [...host.querySelectorAll('table.lilt-chart__sr-only tbody tr')].map((row) =>
        [...row.children].map((cell) => cell.textContent),
      );
      expect(rows.at(-1)).toEqual(['Direct', 'Exit', 'Not measured']);
    } finally {
      unmount();
    }
  });

  it('reads a hovered flow with its share of the step it left', async () => {
    const { host, unmount } = await render(card());
    try {
      await hover(host.querySelector('[data-flow="Browse → Sign-up"]')!);
      expect(headline(host)).toContain('400');
      expect(caption(host)).toBe('Browse → Sign-up · 62% of Browse');
      expect(host.querySelectorAll('.lilt-sankey-card__flow[data-muted]')).toHaveLength(3);
      const lit = [...host.querySelectorAll('.lilt-sankey-card__node:not([data-muted])')].map(
        (node) => node.getAttribute('data-node'),
      );
      expect(lit).toEqual(['Browse', 'Sign-up']);
      expect(host.querySelector('.lilt-chart__sr-only[aria-live]')?.textContent).toBe(
        'Browse to Sign-up: 400',
      );
    } finally {
      unmount();
    }
  });

  it('reads a step with its share of all traffic and what left there', async () => {
    const { host, unmount } = await render(card());
    try {
      await hover(host.querySelector('[data-node="Browse"]')!);
      expect(headline(host)).toContain('650');
      expect(caption(host)).toBe('Browse · 65% of all · 250 left here');
      // Its own flows stay lit.
      expect(host.querySelectorAll('.lilt-sankey-card__flow:not([data-muted])')).toHaveLength(2);
      // A step whose only flow was never measured says so rather than reading zero.
      await act(async () => {
        host
          .querySelector('[data-node="Browse"]')!
          .dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
      });
      await hover(host.querySelector('[data-node="Exit"]')!);
      expect(headline(host)).toBe('—');
      expect(caption(host)).toBe('Exit · Not measured');
    } finally {
      unmount();
    }
  });

  it('steps through flows with the keyboard, left to right', async () => {
    const { host, unmount } = await render(card());
    try {
      const plot = host.querySelector<HTMLDivElement>('.lilt-sankey-card__plot')!;
      const key = (name: string) =>
        act(async () => {
          plot.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        });
      expect(plot.tabIndex).toBe(0);
      await key('ArrowRight');
      expect(caption(host)).toBe('Visits → Browse · 65% of Visits');
      await key('ArrowRight');
      expect(caption(host)).toBe('Visits → Direct · 35% of Visits');
      await key('End');
      expect(caption(host)).toBe('Direct → Sign-up · 29% of Direct');
      await key('Enter');
      await act(async () => {
        plot.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      });
      expect(caption(host)).toBe('Direct → Sign-up · 29% of Direct');
      await key('Escape');
      expect(host.querySelector('.lilt-card__caption')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('shows an error for flows that break the rules, and placeholders while loading', async () => {
    const { host, rerender, unmount } = await render(card({ loading: true }));
    try {
      // Two stages of flows between three columns of nodes, outside the shimmer's mask copy.
      const visible = (selector: string) =>
        [...host.querySelectorAll(selector)].filter((node) => !node.closest('mask'));
      expect(visible('.lilt-sankey-card__skeleton')).toHaveLength(6);
      expect(visible('.lilt-sankey-card__skeleton-node')).toHaveLength(8);
      expect(host.querySelector('.lilt-sankey-card__flow')).toBeNull();
      expect(host.querySelector('table')).toBeNull();
      await rerender(card({ data: flows.slice(0, 4), conservation: 'strict' }));
      expect(host.querySelector('.lilt-chart__status--error')?.textContent).toMatch(
        /^Browse passes on a different amount/,
      );
      await rerender(card({ data: [] }));
      expect(host.querySelector('.lilt-chart-empty__text')?.textContent).toBe(
        'No data for this period',
      );
    } finally {
      unmount();
    }
  });

  it('swaps periods from the range select', async () => {
    const doubled = flows.map((flow) => ({
      ...flow,
      visitors: flow.visitors === null ? null : flow.visitors * 2,
    }));
    const { host, unmount } = await render(
      card({
        data: undefined,
        ranges: [
          { id: 'week', label: 'This week', data: flows, delta: 0.1 },
          { id: 'month', label: 'This month', data: doubled, delta: 0.2 },
        ],
      }),
    );
    try {
      await choosePeriod(host, 'month');
      expect(headline(host)).toContain('2,000');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+20.0%');
    } finally {
      unmount();
    }
  });
});

describe('SankeyChartCard with depth', { timeout: 15_000 }, () => {
  it('lights every flow as a pipe of its exact width and keeps each node front exact', async () => {
    const flat = await render(
      <SankeyChartCard
        motion="none"
        title="Visitor flow"
        data={flows}
        source="from"
        target="to"
        value="visitors"
      />,
    );
    const deep = await render(
      <SankeyChartCard
        motion="none"
        title="Visitor flow"
        data={flows}
        source="from"
        target="to"
        value="visitors"
        depth
      />,
    );
    try {
      const flatFlows = [...flat.host.querySelectorAll('path.lilt-sankey-card__flow')];
      const deepFlows = [...deep.host.querySelectorAll('g.lilt-sankey-card__flow')];
      expect(deepFlows).toHaveLength(flatFlows.length);
      deepFlows.forEach((flow, index) => {
        const layers = [...flow.querySelectorAll('path')];
        // The widest layer is the flow itself; every other layer runs along the same path.
        expect(parseFloat((layers[0] as SVGPathElement).style.strokeWidth)).toBeCloseTo(
          Number(flatFlows[index]!.getAttribute('stroke-width')),
        );
        expect(new Set(layers.map((layer) => layer.getAttribute('d'))).size).toBe(1);
        expect(
          layers.every((layer) => /^translate\(0(\.0+)? /.test(layer.getAttribute('transform')!)),
        ).toBe(true);
      });
      const fronts = [...deep.host.querySelectorAll('g.lilt-sankey-card__node')].map((node) =>
        node.querySelectorAll('path')[2]!.getAttribute('d'),
      );
      const rects = [...flat.host.querySelectorAll('rect.lilt-sankey-card__node')].map((node) => {
        const [x, y, width, height] = ['x', 'y', 'width', 'height'].map((name) =>
          Number(node.getAttribute(name)),
        );
        return `M${x},${y}H${x! + width!}V${y! + height!}H${x}Z`;
      });
      expect(fronts).toEqual(rects);
    } finally {
      flat.unmount();
      deep.unmount();
    }
  });
});
