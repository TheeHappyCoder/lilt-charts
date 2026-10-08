// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ValueLegend } from './value-legend';
import { AreaChartCard } from '../cards/area-chart-card';
import { RadialChartCard } from '../cards/radial-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const items = [
  { id: 'a', label: 'A', color: '#f00', value: 1, formattedValue: '1' },
  { id: 'b', label: 'B', color: '#0f0', value: 2, formattedValue: '2' },
  { id: 'c', label: 'C', color: '#00f', value: 3, formattedValue: '3' },
] as const;

function Harness() {
  const [hidden, setHidden] = useState<('a' | 'b' | 'c')[]>([]);
  return <ValueLegend items={items} hiddenIds={hidden} onHiddenIdsChange={setHidden} />;
}

async function render(element: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const visibility = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>('.lilt-chart__legend-item')]
    .map((item) => item.dataset.visible)
    .join(',');
const actions = (host: HTMLElement, index: number) =>
  [...host.querySelectorAll('.lilt-chart__legend-item')[index]!.querySelectorAll('button')]
    .slice(1)
    .map((button) => button.textContent);
const click = (element: Element) =>
  act(async () => {
    (element as HTMLElement).click();
  });

describe('Legend visibility', { timeout: 15_000 }, () => {
  it('toggles on click, isolates with Only, restores with Show all, and keeps one shown', async () => {
    const { host, unmount } = await render(<Harness />);
    try {
      const toggles = () => host.querySelectorAll('.lilt-chart__legend-toggle');
      expect(actions(host, 0)).toEqual(['Only']);

      await click(toggles()[1]!);
      expect(visibility(host)).toBe('true,false,true');
      expect(actions(host, 0)).toEqual(['Only', 'Show all']);

      await click(
        host
          .querySelectorAll('.lilt-chart__legend-item')[2]!
          .querySelector('.lilt-chart__legend-action')!,
      );
      expect(visibility(host)).toBe('false,false,true');
      // The only series shown can't be hidden, and it offers Show all instead of Only.
      expect(actions(host, 2)).toEqual(['Show all']);
      await click(toggles()[2]!);
      expect(visibility(host)).toBe('false,false,true');

      await click(
        host
          .querySelectorAll('.lilt-chart__legend-item')[2]!
          .querySelector('.lilt-chart__legend-action')!,
      );
      expect(visibility(host)).toBe('true,true,true');
    } finally {
      unmount();
    }
  });

  it('drops a hidden series from an Area card’s headline and plot', async () => {
    const { host, unmount } = await render(
      <AreaChartCard
        motion="none"
        title="Visitors"
        data={[
          { month: 'Jan', organic: 100, paid: 40 },
          { month: 'Feb', organic: 200, paid: 60 },
        ]}
        x="month"
        series={[{ key: 'organic' }, { key: 'paid' }]}
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('400');
      await click(host.querySelectorAll('.lilt-chart__legend-toggle')[1]!);
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('300');
      expect(
        host.querySelector('.lilt-chart__legend-item[data-visible="false"]')?.textContent,
      ).toContain('paid');
    } finally {
      unmount();
    }
  });

  it('recomputes Radial shares over the categories still shown', async () => {
    const { host, unmount } = await render(
      <RadialChartCard
        motion="none"
        title="Revenue"
        data={[
          { channel: 'A', revenue: 50 },
          { channel: 'B', revenue: 30 },
          { channel: 'C', revenue: 20 },
        ]}
        category="channel"
        value="revenue"
      />,
    );
    try {
      await click(host.querySelectorAll('.lilt-radial-card__row')[0]!);
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('50');
      expect(host.querySelectorAll('.lilt-radial-card__slice')).toHaveLength(2);
      expect(
        [...host.querySelectorAll('.lilt-radial-card__share')].map((share) => share.textContent),
      ).toEqual(['—', '60%', '40%']);
    } finally {
      unmount();
    }
  });
});
