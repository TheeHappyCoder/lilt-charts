// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from '../cards/area-chart-card';
import { BarChartCard } from '../cards/bar-chart-card';
import { RadialChartCard } from '../cards/radial-chart-card';
import { ChartEmpty } from './chart-empty';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

type Reading = { month: string; visitors: number | null };
type Channel = { channel: string; visitors: number };

const none: Reading[] = [];
const nulls: Reading[] = [
  { month: 'Jan', visitors: null },
  { month: 'Feb', visitors: null },
];
const series = [{ key: 'visitors', label: 'Visitors' }] as const;

const mounted: { host: HTMLElement; root: ReturnType<typeof createRoot> }[] = [];

async function render(element: React.ReactElement) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 240,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 600,
    bottom: 240,
    toJSON: () => ({}),
  } as DOMRect);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ host, root });
  await act(async () => root.render(element));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
  return host;
}

afterEach(() => {
  for (const { host, root } of mounted.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  vi.restoreAllMocks();
});

const area = (props: Partial<React.ComponentProps<typeof AreaChartCard<Reading, 'visitors'>>>) => (
  <AreaChartCard title="Visitors" data={none} x="month" series={series} {...props} />
);
const text = (host: HTMLElement) => host.querySelector('.lilt-chart-empty__text')?.textContent;

describe('empty state', () => {
  it('shows the dot field and a dash, never a false zero, by default', async () => {
    const host = await render(area({}));
    expect(host.querySelector('.lilt-chart-empty')?.getAttribute('data-look')).toBe('dots');
    expect(text(host)).toBe('No data for this period');
    expect(host.querySelector('.lilt-card__value')?.textContent).not.toContain('0');
    expect(host.querySelector('.lilt-chart__status')).toBeNull();
  });

  it('drops a supplied change when nothing was measured', async () => {
    const host = await render(area({ delta: 0.124 }));
    expect(host.querySelector('.lilt-card__delta')).toBeNull();
  });

  it('says the values are missing when every row is null', async () => {
    const host = await render(area({ data: nulls }));
    expect(text(host)).toBe('No values for this period');
  });

  it("draws the family's own outline with the shape look", async () => {
    const host = await render(
      <BarChartCard title="Signups" data={none} x="month" series={series} empty="shape" />,
    );
    expect(host.querySelector('.lilt-chart-empty')?.getAttribute('data-look')).toBe('shape');
    expect(host.querySelector('.lilt-chart-empty__shape')?.getAttribute('data-shape')).toBe('bars');
  });

  it('takes your own words in the built-in look', async () => {
    const host = await render(area({ empty: <ChartEmpty look="shape">No visits yet</ChartEmpty> }));
    expect(text(host)).toBe('No visits yet');
    expect(host.querySelector('.lilt-chart-empty__shape')?.getAttribute('data-shape')).toBe('wave');
  });

  it('places any element in the plot area, and nothing with null', async () => {
    const custom = await render(area({ empty: <p className="mine">Connect a source</p> }));
    expect(custom.querySelector('.lilt-chart__empty .mine')?.textContent).toBe('Connect a source');
    expect(custom.querySelector('.lilt-chart-empty')).toBeNull();

    const nothing = await render(area({ empty: null }));
    expect(nothing.querySelector('.lilt-chart__empty')).toBeNull();
  });

  it('stays away while data is present', async () => {
    const host = await render(area({ data: [{ month: 'Jan', visitors: 12 }] }));
    expect(host.querySelector('.lilt-chart__empty')).toBeNull();
  });

  // The skeleton's clock keeps timers running, so a busy run needs more than the default.
  it('stays away while loading', { timeout: 15_000 }, async () => {
    const host = await render(area({ loading: true }));
    expect(host.querySelector('.lilt-chart__empty')).toBeNull();
  });

  it('keeps an empty card at its size, with the same words on every family', async () => {
    const host = await render(
      <RadialChartCard<Channel, 'visitors'>
        title="Visitors by channel"
        data={[]}
        category="channel"
        value="visitors"
        empty="shape"
      />,
    );
    expect(host.querySelector('.lilt-chart__empty')?.hasAttribute('data-block')).toBe(true);
    expect(host.querySelector('.lilt-chart-empty__shape')?.getAttribute('data-shape')).toBe('ring');
    expect(text(host)).toBe('No data for this period');
  });
});
