// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderBook } from './order-book';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bids = [
  { price: 99, size: 2 },
  { price: 100, size: 1 },
  { price: 98, size: 4 },
];
const asks = [
  { price: 101.5, size: 3 },
  { price: 101, size: 1 },
];

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});

const rowText = (row: Element) =>
  [...row.children].map((cell) => cell.textContent?.trim()).join(' | ');

describe('OrderBook', () => {
  it('is a captioned table: asks highest first, the spread, then bids best first', async () => {
    await act(async () => root.render(<OrderBook title="Test book" bids={bids} asks={asks} />));
    const table = host.querySelector('table')!;
    expect(table.querySelector('caption')?.textContent).toBe('Test book');
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual([
      'Price',
      'Size',
      'Total',
    ]);
    const [askBody, spreadBody, bidBody] = [...table.querySelectorAll('tbody')];
    expect(askBody!.getAttribute('aria-label')).toBe('Asks');
    expect([...askBody!.querySelectorAll('tr')].map(rowText)).toEqual([
      '101.50 | 3 | 4',
      '101.00 | 1 | 1',
    ]);
    expect(spreadBody!.textContent).toBe('100.50Spread 1.00 · 0.995%');
    expect([...bidBody!.querySelectorAll('tr')].map(rowText)).toEqual([
      '100.00 | 1 | 1',
      '99.00 | 2 | 3',
      '98.00 | 4 | 7',
    ]);
    // Every level is a row header, so a screen reader announces its price first.
    expect(bidBody!.querySelector('tr > th[scope="row"]')).not.toBeNull();
  });

  it('sizes depth bars by running total against the deeper side', async () => {
    await act(async () => root.render(<OrderBook title="Book" bids={bids} asks={asks} />));
    const deepest = host.querySelector<HTMLElement>('tbody[aria-label="Bids"] tr:last-child')!;
    const best = host.querySelector<HTMLElement>('tbody[aria-label="Bids"] tr:first-child')!;
    expect(deepest.style.getPropertyValue('--lilt-depth')).toBe('100%');
    expect(Number.parseFloat(best.style.getPropertyValue('--lilt-depth'))).toBeCloseTo(
      (1 / 7) * 100,
      6,
    );
  });

  it('shows only the best `levels` a side', async () => {
    await act(async () =>
      root.render(<OrderBook title="Book" bids={bids} asks={asks} levels={1} />),
    );
    expect(host.querySelectorAll('.lilt-order-book__level')).toHaveLength(2);
  });

  it('flashes a level once when its size changes', async () => {
    await act(async () => root.render(<OrderBook title="Book" bids={bids} asks={asks} />));
    expect(host.querySelector('[data-flash]')).toBeNull();
    await act(async () =>
      root.render(
        <OrderBook
          title="Book"
          bids={[{ price: 100, size: 5 }, ...bids.slice(0, 1), bids[2]!]}
          asks={asks}
        />,
      ),
    );
    const flashing = [...host.querySelectorAll('[data-flash]')].map(rowText);
    expect(flashing).toEqual(['100.00 | 5 | 5']);
    await act(async () => vi.advanceTimersByTime(700));
    expect(host.querySelector('[data-flash]')).toBeNull();
  });

  it('does not flash when motion is off', async () => {
    await act(async () =>
      root.render(<OrderBook title="Book" bids={bids} asks={asks} motion="none" />),
    );
    await act(async () =>
      root.render(
        <OrderBook
          title="Book"
          bids={[{ price: 100, size: 5 }, bids[0]!, bids[2]!]}
          asks={asks}
          motion="none"
        />,
      ),
    );
    expect(host.querySelector('[data-flash]')).toBeNull();
  });
});
