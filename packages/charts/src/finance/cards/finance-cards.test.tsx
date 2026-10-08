// @vitest-environment jsdom

import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CandlestickChartCard } from './candlestick-chart-card';
import { DepthChartCard } from './depth-chart-card';
import { IndicatorChartCard } from './indicator-chart-card';
import { PortfolioChartCard } from './portfolio-chart-card';
import { PriceChartCard } from './price-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const day = 86_400_000;
const candles = Array.from({ length: 40 }, (_, index) => {
  const open = 100 + Math.sin(index / 3) * 8 + index * 0.4;
  const close = open + (index % 3 === 0 ? -1.5 : 2);
  return {
    date: new Date(Date.UTC(2026, 6, 1) + index * day),
    open,
    close,
    high: Math.max(open, close) + 1,
    low: Math.min(open, close) - 1,
    volume: 1_000 + index * 25,
    basis: 90 + Math.floor(index / 10) * 5,
  };
});

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 640,
    height: 240,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 640,
    bottom: 240,
    toJSON: () => ({}),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

const render = (element: ReactElement) => act(async () => root.render(element));

/** Keyboard focus on the main plot inspects the latest observation. */
async function inspectLatest() {
  const input = host.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
  await act(async () => input.focus());
}

/** The x position of the latest observation's mark in each plot, read from its path data. */
function lastColumnCenters(): number[] {
  return [...host.querySelectorAll('svg.lilt-chart__svg')].map((svg) => {
    const numbers = [...svg.querySelectorAll('.lilt-chart__candles path, [data-lilt-bar]')]
      .flatMap((mark) => [...(mark.getAttribute('d') ?? '').matchAll(/[ML]([\d.]+),/g)])
      .map((match) => Number(match[1]));
    return Math.max(...numbers);
  });
}

describe('finance cards', { timeout: 15_000 }, () => {
  it('draws candles with a linked volume pane that shares its x positions', async () => {
    await render(
      <CandlestickChartCard
        title="Test"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        volume="volume"
        motion="none"
      />,
    );
    expect(host.querySelector('.lilt-chart__candles')).not.toBeNull();
    expect(host.querySelector('.lilt-card__pane-name')?.textContent).toBe('Volume');
    const [price, volume] = lastColumnCenters();
    expect(Math.abs(price! - volume!)).toBeLessThan(8);
    // The headline is the latest close, the chip the change since the first open.
    expect(host.querySelector('.lilt-card__delta')?.textContent).toMatch(/^\+/);
  });

  it('follows new candles in live mode and moves the headline to the latest close', async () => {
    const card = (data: typeof candles) => (
      <CandlestickChartCard
        title="Live"
        data={data}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        live
        motion="none"
      />
    );
    await render(card(candles));
    const plot = () => host.querySelector('[data-lilt-live]');
    expect(plot()?.getAttribute('data-lilt-live')).toBe('following');
    expect(host.querySelector('.lilt-chart__live-badge')?.textContent).toBe('Live');
    const before = host.querySelector('.lilt-chart__candles')!.innerHTML;
    const last = candles.at(-1)!;
    const next = {
      ...last,
      date: new Date(last.date.getTime() + day),
      open: last.close,
      close: last.close + 3,
      high: last.close + 4,
      low: last.close - 1,
    };
    await render(card([...candles.slice(1), next]));
    expect(host.querySelector('.lilt-chart__candles')!.innerHTML).not.toBe(before);
    expect(plot()?.getAttribute('data-lilt-live')).toBe('following');
    expect(host.querySelector('.lilt-card__value')?.textContent).toContain(next.close.toFixed(2));
  });

  it('reads the hovered candle’s open, high and low beside its date', async () => {
    await render(
      <CandlestickChartCard
        title="Test"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        motion="none"
      />,
    );
    await inspectLatest();
    const caption = host.querySelector('.lilt-card__caption')?.textContent ?? '';
    const last = candles.at(-1)!;
    expect(caption).toContain(`O ${last.open.toFixed(2)}`);
    expect(caption).toContain(`H ${last.high.toFixed(2)}`);
    expect(caption).toContain(`L ${last.low.toFixed(2)}`);
  });

  it('steps between candles with the arrow keys', async () => {
    await render(
      <CandlestickChartCard
        title="Test"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        motion="none"
      />,
    );
    await inspectLatest();
    const input = host.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
    // The observation control is a range input: ArrowLeft lowers its value by one step.
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setValue.call(input, String(Number(input.value) - 1));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const previous = candles.at(-2)!;
    const caption = host.querySelector('.lilt-card__caption')?.textContent ?? '';
    expect(caption).toContain(`O ${previous.open.toFixed(2)}`);
    expect(host.querySelector('.lilt-chart__candle-highlight')).not.toBeNull();
  });

  it('lights the inspected column in the candle’s own direction', async () => {
    await render(
      <CandlestickChartCard
        title="Test"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        motion="none"
      />,
    );
    const band = () =>
      host
        .querySelector<SVGGElement>('.lilt-chart__hover-band')!
        .style.getPropertyValue('--lilt-hover-band-color');
    // The latest candle falls; the one before it rises.
    await inspectLatest();
    expect(band()).toBe('var(--lilt-candle-down)');
    const input = host.querySelector<HTMLInputElement>('.lilt-chart__keyboard-input input')!;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setValue.call(input, String(Number(input.value) - 1));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(band()).toBe('var(--lilt-candle-up)');
  });

  it('stacks RSI and MACD panes under the price with live readouts', async () => {
    await render(
      <IndicatorChartCard
        title="Test"
        data={candles}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        overlays={['sma', 'bollinger']}
        motion="none"
      />,
    );
    const names = [...host.querySelectorAll('.lilt-card__pane-name')].map(
      (item) => item.textContent,
    );
    expect(names).toEqual(['RSI 14', 'MACD 12 · 26 · 9']);
    expect(host.querySelectorAll('.lilt-card__pane-value').length).toBeGreaterThanOrEqual(3);
    expect(host.querySelector('.lilt-chart__interval-band path')).not.toBeNull();
    expect(host.querySelector('.lilt-chart__reference-band[data-axis="y"]')).not.toBeNull();
  });

  it('refuses candles without open, high and low', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      render(
        <IndicatorChartCard title="Test" data={candles} x="date" close="close" display="candle" />,
      ),
    ).rejects.toThrow('need open, high and low');
    error.mockRestore();
  });

  it('puts the mid price, spread and depth in a depth card', async () => {
    await render(
      <DepthChartCard
        title="Book"
        bids={[
          { price: 99, size: 2 },
          { price: 100, size: 1 },
        ]}
        asks={[
          { price: 101, size: 3 },
          { price: 102, size: 1 },
        ]}
        motion="none"
      />,
    );
    const stats = [...host.querySelectorAll('.lilt-card__stats dd')].map(
      (item) => item.textContent,
    );
    expect(stats).toEqual(['$1.00 (0.995%)', '3', '4']);
    expect(host.querySelector('.lilt-card__depth-mid text')?.textContent).toBe('Mid $100.50');
  });

  it('shades drawdown under a portfolio and reads the gain over basis', async () => {
    await render(
      <PortfolioChartCard
        title="Portfolio"
        data={candles}
        x="date"
        value="close"
        basis="basis"
        motion="none"
      />,
    );
    expect(host.querySelector('.lilt-card__pane-name')?.textContent).toBe('Drawdown');
    expect(host.querySelector('.lilt-card__value-row')?.textContent).toContain('over basis');
  });

  it('shows a ticker with its change in money, or rebases instruments with versus', async () => {
    await render(
      <PriceChartCard
        title="Price"
        symbol="TST"
        name="Test"
        data={candles}
        x="date"
        price="close"
      />,
    );
    expect(host.querySelector('.lilt-card__ticker-symbol')?.textContent).toBe('TST');
    expect(host.querySelector('.lilt-card__value-row')?.textContent).toMatch(/[+−]\$/);
    await render(
      <PriceChartCard
        title="Price"
        data={candles}
        x="date"
        price="close"
        versus={[{ key: 'open', label: 'Open' }]}
        motion="none"
      />,
    );
    // Rebased series start at zero change, so both lines share one axis.
    expect(host.querySelectorAll('.lilt-chart__line').length).toBeGreaterThanOrEqual(2);
  });

  it('honors a custom price formatter, while versus keeps its percentage units', async () => {
    const props = {
      data: candles,
      x: 'date' as const,
      price: 'close' as const,
      formatValue: (value: number) => `CUSTOM ${value.toFixed(3)}`,
      motion: 'none' as const,
    };
    await render(<PriceChartCard {...props} />);
    expect(host.querySelector('.lilt-card__value-row')?.textContent).toContain(
      `CUSTOM ${candles.at(-1)!.close.toFixed(3)}`,
    );
    await render(<PriceChartCard {...props} versus={[{ key: 'open' }]} />);
    expect(host.querySelector('.lilt-card__value-row')?.textContent).not.toContain('CUSTOM');
    expect(host.querySelector('.lilt-card__value-row')?.textContent).toContain('%');
  });
});
