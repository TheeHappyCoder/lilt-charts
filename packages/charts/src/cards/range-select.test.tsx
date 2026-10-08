// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { ChartComponentsProvider, type ChartRangeSelectProps } from './range-select';
import { chosenPeriod } from '../test-utils/choose-period';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ranges = [
  {
    id: 'week',
    label: 'This week',
    data: [
      { x: 1, v: 10 },
      { x: 2, v: 12 },
    ],
  },
  {
    id: 'month',
    label: 'This month',
    data: [
      { x: 1, v: 40 },
      { x: 2, v: 44 },
    ],
  },
  {
    id: 'year',
    label: 'This year',
    data: [
      { x: 1, v: 400 },
      { x: 2, v: 480 },
    ],
  },
];

async function mount(element: React.ReactElement) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 480,
    height: 240,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 480,
    bottom: 240,
    toJSON: () => ({}),
  } as DOMRect);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    },
  };
}

const key = async (target: Element, value: string) =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }));
  });

describe('period select', { timeout: 15_000 }, () => {
  it('works from the keyboard and hands focus back to the pill', async () => {
    const { host, unmount } = await mount(
      <AreaChartCard title="Revenue" ranges={ranges} x="x" series={[{ key: 'v' }]} />,
    );
    try {
      const trigger = host.querySelector<HTMLButtonElement>('.lilt-range-select__trigger')!;
      expect(trigger.getAttribute('aria-label')).toBe('Period: This week');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.focus();
      await key(trigger, 'ArrowDown');
      const list = host.querySelector<HTMLElement>('[role="listbox"]')!;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(list);
      // Opening with Down lands on the next period, ready to choose.
      expect(list.getAttribute('aria-activedescendant')).toMatch(/option-1$/);

      await key(list, 'End');
      expect(list.getAttribute('aria-activedescendant')).toMatch(/option-2$/);
      await key(list, 'Enter');
      expect(chosenPeriod(host)).toBe('year');
      expect(document.activeElement).toBe(trigger);

      await key(trigger, 'ArrowUp');
      const reopened = host.querySelector<HTMLElement>('[role="listbox"]')!;
      await key(reopened, 'Escape');
      expect(chosenPeriod(host)).toBe('year');
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('marks the chosen period and jumps to a period by its first letter', async () => {
    const { host, unmount } = await mount(
      <AreaChartCard title="Revenue" ranges={ranges} x="x" series={[{ key: 'v' }]} />,
    );
    try {
      const trigger = host.querySelector<HTMLButtonElement>('.lilt-range-select__trigger')!;
      await act(async () => trigger.click());
      const options = [...host.querySelectorAll('[role="option"]')];
      expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false',
      ]);
      const list = host.querySelector<HTMLElement>('[role="listbox"]')!;
      // Every label starts with T, so typing it walks forward through them.
      await key(list, 't');
      expect(list.getAttribute('aria-activedescendant')).toMatch(/option-1$/);
    } finally {
      unmount();
    }
  });

  it('uses the select an app supplies through the provider', async () => {
    const seen: ChartRangeSelectProps[] = [];
    function AppSelect(props: ChartRangeSelectProps) {
      seen.push(props);
      return (
        <button type="button" data-app-select onClick={() => props.onValueChange('month')}>
          {props.options.find((option) => option.id === props.value)?.label}
        </button>
      );
    }
    const { host, unmount } = await mount(
      <ChartComponentsProvider rangeSelect={AppSelect}>
        <AreaChartCard title="Revenue" ranges={ranges} x="x" series={[{ key: 'v' }]} />
      </ChartComponentsProvider>,
    );
    try {
      expect(host.querySelector('.lilt-range-select__trigger')).toBeNull();
      const button = host.querySelector<HTMLButtonElement>('[data-app-select]')!;
      expect(button.textContent).toBe('This week');
      expect(seen.at(-1)?.['aria-label']).toBe('Period');
      expect(seen.at(-1)?.options.map((option) => option.id)).toEqual(['week', 'month', 'year']);
      await act(async () => button.click());
      expect(host.querySelector('[data-app-select]')?.textContent).toBe('This month');
    } finally {
      unmount();
    }
  });
});
