// @vitest-environment jsdom

import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CohortRetentionCard, cohortRetentionLayout } from '../../cards/cohort-retention-card';
import { EarningsCard, earningsLayout, surprise } from './earnings-card';
import { MarketMapCard, marketMapLayout } from './market-map-card';
import { MonthlyReturnsCard, monthlyReturns, monthlyReturnsLayout } from './monthly-returns-card';
import { PayoffChartCard, payoffAt, payoffSummary } from './payoff-chart-card';
import { niceTicks } from './scale';
import { volumeProfile, VolumeProfileCard } from './volume-profile-card';
import { sparkPath, WatchlistCard } from './watchlist-card';
import { curveSpread, YieldCurveCard } from './yield-curve-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const money = (value: number) => `$${value.toFixed(2)}`;

describe('payoff', () => {
  const call = { type: 'call' as const, strike: 100, premium: 5 };

  it('prices a long call at expiry, per contract', () => {
    expect(payoffAt([call], 100, 90)).toBe(-500);
    expect(payoffAt([call], 100, 105)).toBe(0);
    expect(payoffAt([call], 100, 120)).toBe(1500);
  });

  it('finds breakevens and bounds a spread, and flags unbounded profit', () => {
    const spread = [
      call,
      { type: 'call' as const, side: 'short' as const, strike: 110, premium: 2 },
    ];
    const summary = payoffSummary(spread, 100, [80, 130]);
    expect(summary.breakevens).toHaveLength(1);
    expect(summary.breakevens[0]).toBeCloseTo(103, 6);
    expect(summary.maxProfit).toBe(700);
    expect(summary.maxLoss).toBe(-300);
    expect(payoffSummary([call], 100, [80, 130]).maxProfit).toBeNull();
  });

  it('counts stock legs in shares and short calls as unbounded loss', () => {
    expect(payoffAt([{ type: 'stock', strike: 50, quantity: 10 }], 100, 60)).toBe(100);
    const naked = payoffSummary([{ ...call, side: 'short' }], 100, [80, 130]);
    expect(naked.maxLoss).toBeNull();
    expect(naked.maxProfit).toBe(500);
  });
});

describe('monthly returns', () => {
  const day = (iso: string, price: number) => ({ date: iso, price });

  it('returns each month from the close before, and leaves an empty month missing', () => {
    const months = monthlyReturns(
      [
        day('2026-01-02', 100),
        day('2026-01-30', 110),
        day('2026-02-27', 99),
        day('2026-04-30', 108.9),
      ],
      'date',
      'price',
    );
    if ('error' in months) throw new Error(months.error);
    expect(months.map((month) => month.month)).toEqual([0, 1, 2, 3]);
    expect(months[0]!.value).toBeCloseTo(0.1, 9);
    expect(months[1]!.value).toBeCloseTo(-0.1, 9);
    expect(months[2]).toMatchObject({ value: null, missing: true });
    expect(months[3]!.value).toBeCloseTo(0.1, 9);
  });

  it('compounds the headline and each year total', () => {
    const rows = [day('2025-12-31', 100), day('2026-01-31', 110), day('2026-02-28', 121)];
    const scene = monthlyReturnsLayout(rows, 'date', 'price', true, 0.08, 640, 200, percent);
    expect(scene.headline).toBeCloseTo(0.21, 9);
    const total = scene.marks.find((mark) => mark.id === '2026');
    expect(total?.value).toBeCloseTo(0.21, 9);
    expect(scene.labels?.some((label) => label.text === '2025')).toBe(true);
  });

  it('rejects rows without a date', () => {
    expect(monthlyReturns([{ date: 'not a date', price: 1 }], 'date', 'price')).toEqual({
      error: 'Each row needs a valid date.',
    });
  });
});

describe('volume profile', () => {
  const rows = [
    { close: 10, open: 9, high: 10, low: 8, volume: 200 },
    { close: 9, open: 10, high: 10, low: 9, volume: 100 },
  ];

  it('spreads volume over each period’s range and splits it by direction', () => {
    const profile = volumeProfile(
      rows,
      { close: 'close', open: 'open', high: 'high', low: 'low', volume: 'volume' },
      2,
      0.7,
    );
    if (!profile || 'error' in profile) throw new Error('no profile');
    expect(profile.total).toBeCloseTo(300, 9);
    expect(profile.bins[0]).toMatchObject({ bought: 100, sold: 0 });
    expect(profile.bins[1]).toMatchObject({ bought: 100, sold: 100 });
    expect(profile.poc).toBe(1);
    expect(profile.last).toBe(9);
  });

  it('rejects impossible bins, shares and ranges', () => {
    const keys = { close: 'close', volume: 'volume', high: 'high', low: 'low' };
    expect(volumeProfile(rows, keys, 1, 0.7)).toHaveProperty('error');
    expect(volumeProfile(rows, keys, 4, 0)).toHaveProperty('error');
    expect(volumeProfile([{ close: 1, high: 1, low: 2, volume: 1 }], keys, 4, 0.7)).toHaveProperty(
      'error',
    );
  });
});

describe('earnings, market map, cohort retention and the yield curve', () => {
  it('reads surprises as a share of the estimate', () => {
    expect(surprise(2, 2.2)).toBeCloseTo(0.1, 9);
    expect(surprise(-1, -0.5)).toBeCloseTo(0.5, 9);
    expect(surprise(1, null)).toBeNull();
  });

  it('draws a ring per estimate and a dot per result, the latest result as headline', () => {
    const scene = earningsLayout(
      [
        { q: 'Q1', est: 1, act: 1.1 },
        { q: 'Q2', est: 1.2, act: 1.1 },
        { q: 'Q3', est: 1.3, act: null },
      ],
      'q',
      'est',
      'act',
      600,
      240,
      money,
      money,
      percent,
    );
    expect(scene.marks.filter((mark) => mark.future)).toHaveLength(3);
    expect(scene.marks.filter((mark) => !mark.future)).toHaveLength(2);
    expect(scene.headline).toBe(1.1);
    expect(scene.note).toContain('1 of 2');
  });

  it('colors market tiles by move and keeps every row readable', () => {
    const scene = marketMapLayout(
      [
        { s: 'A', cap: 30, move: 0.02, sector: 'Tech' },
        { s: 'B', cap: 0, move: -0.01, sector: 'Tech' },
        { s: 'C', cap: 20, move: -0.04, sector: 'Energy' },
      ],
      's',
      'cap',
      'move',
      'sector',
      0.03,
      600,
      300,
      percent,
    );
    expect(scene.marks).toHaveLength(2);
    expect(scene.readings).toHaveLength(3);
    expect(scene.marks.find((mark) => mark.label === 'C')?.color).toContain('candle-down');
  });

  it('weights the average cohort by size and steps the grid down', () => {
    const scene = cohortRetentionLayout(
      [
        { c: 'Jan', n: 100, p0: 1, p1: 0.5 },
        { c: 'Feb', n: 300, p0: 1, p1: 0.3 },
        { c: 'Mar', n: 50, p0: 1, p1: null },
      ],
      'c',
      ['p0', 'p1'],
      undefined,
      'n',
      true,
      undefined,
      undefined,
      600,
      240,
    );
    expect(scene.headline).toBeCloseTo((0.5 * 100 + 0.3 * 300) / 400, 9);
    expect(scene.marks).toHaveLength(5 + 2);
    expect(
      cohortRetentionLayout(
        [{ c: 'A', p0: 1.4 }],
        'c',
        ['p0'],
        undefined,
        undefined,
        true,
        undefined,
        undefined,
        400,
        200,
      ).error,
    ).toBeDefined();
  });

  it('reads the 2s10s spread, inverted below zero', () => {
    const curve = [
      { m: '3M', y: 5.3 },
      { m: '2Y', y: 4.6 },
      { m: '10Y', y: 4.2 },
    ];
    expect(curveSpread(curve, 'm', 'y')?.value).toBeCloseTo(-0.4, 9);
    expect(curveSpread(curve, 'm', 'y', ['3M', '10Y'])?.value).toBeCloseTo(-1.1, 9);
  });

  it('draws sparklines through every point and rounds ticks', () => {
    expect(sparkPath([1, 2, 3], 10, 10).split(/[ML]/).filter(Boolean)).toHaveLength(3);
    expect(sparkPath([1], 10, 10)).toBe('');
    expect(niceTicks(0.8, 1.6, 3)).toEqual([1, 1.5]);
  });
});

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
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
  vi.unstubAllGlobals();
});

const render = (element: ReactElement) => act(async () => root.render(element));

describe('market cards render', () => {
  const watch = [
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 205.5,
      change: 0.042,
      history: [190, 198, 205.5],
      low: 196,
      high: 207,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3114.8,
      change: -0.012,
      history: [3150, 3120, 3114.8],
      low: 3090,
      high: 3170,
    },
  ];

  it('lists a watchlist, sorts it, and reads a row in the headline', async () => {
    await render(
      <WatchlistCard
        title="Watchlist"
        data={watch}
        symbol="symbol"
        name="name"
        price="price"
        change="change"
        history="history"
        low="low"
        high="high"
      />,
    );
    const symbols = () =>
      [...host.querySelectorAll('.lilt-watchlist__symbol')].map((cell) => cell.textContent);
    expect(symbols()).toEqual(['SOL', 'ETH']);
    expect(host.querySelector('.lilt-card__caption')?.textContent).toContain('1 up, 1 down');
    const sortByPrice = [...host.querySelectorAll<HTMLButtonElement>('.lilt-watchlist__sort')].find(
      (button) => button.textContent?.startsWith('Price'),
    )!;
    await act(async () => sortByPrice.click());
    expect(symbols()).toEqual(['ETH', 'SOL']);
    const row = host.querySelector<HTMLTableRowElement>('tbody tr')!;
    await act(async () => row.focus());
    expect(host.querySelector('.lilt-card__caption')?.textContent).toContain('ETH');
    expect(host.querySelectorAll('.lilt-watchlist__spark-line')).toHaveLength(2);
    expect(host.querySelectorAll('.lilt-watchlist__range-mark')).toHaveLength(2);
  });

  it('shows skeleton rows while loading and the empty state with no rows', async () => {
    const empty: { symbol: string; price: number; change: number }[] = [];
    await render(
      <WatchlistCard data={empty} loading symbol="symbol" price="price" change="change" />,
    );
    expect(host.querySelectorAll('.lilt-watchlist__placeholder')).toHaveLength(5);
    expect(host.querySelector('.lilt-watchlist__table.lilt-skeleton')).not.toBeNull();
    await render(<WatchlistCard data={empty} symbol="symbol" price="price" change="change" />);
    // The skeleton plays its exit before the empty state takes its place.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(host.querySelector('.lilt-chart__empty')).not.toBeNull();
  });

  it('renders a payoff with its stats', async () => {
    await render(
      <PayoffChartCard
        title="Bull call spread"
        spot={102}
        legs={[
          { type: 'call', strike: 100, premium: 5 },
          { type: 'call', side: 'short', strike: 110, premium: 2 },
        ]}
      />,
    );
    const stats = host.querySelector('.lilt-card__stats')!.textContent!;
    expect(stats).toContain('+$700');
    expect(stats).toContain('−$300');
    expect(stats).toContain('$103.00');
    expect(host.querySelector('.lilt-card__caption')?.textContent).toContain('today');
  });

  it('renders the observation families as inspectable marks', async () => {
    const days = Array.from({ length: 90 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 0, 1) + index * 86_400_000),
      close: 100 + Math.sin(index / 6) * 10,
      open: 100 + Math.cos(index / 6) * 10,
      volume: 1000 + index * 10,
    }));
    for (const card of [
      <MonthlyReturnsCard key="r" title="Returns" data={days} x="date" price="close" />,
      <VolumeProfileCard
        key="v"
        title="Profile"
        data={days}
        close="close"
        open="open"
        volume="volume"
      />,
      <MarketMapCard
        key="m"
        title="Market"
        data={[
          { s: 'A', cap: 3, move: 0.01 },
          { s: 'B', cap: 2, move: -0.02 },
        ]}
        label="s"
        value="cap"
        change="move"
      />,
      <EarningsCard
        key="e"
        title="EPS"
        data={[
          { q: 'Q1', est: 1, act: 1.1 },
          { q: 'Q2', est: 1.1, act: null },
        ]}
        period="q"
        estimate="est"
        actual="act"
      />,
      <CohortRetentionCard
        key="c"
        title="Retention"
        data={[
          { c: 'Jan', p0: 1, p1: 0.4 },
          { c: 'Feb', p0: 1, p1: null },
        ]}
        cohort="c"
        periods={['p0', 'p1']}
      />,
    ]) {
      await render(card);
      expect(host.querySelectorAll('.lilt-observations-card__mark').length).toBeGreaterThan(1);
      expect(host.querySelector('.lilt-chart__sr-only tbody tr')).not.toBeNull();
    }
  });

  it('renders a yield curve with its spread caption', async () => {
    await render(
      <YieldCurveCard
        title="Treasury curve"
        data={[
          { m: '3M', y: 5.3, ago: 5.1 },
          { m: '2Y', y: 4.6, ago: 4.4 },
          { m: '10Y', y: 4.2, ago: 4.5 },
        ]}
        maturity="m"
        yield="y"
        versus={[{ key: 'ago', label: 'A year ago' }]}
      />,
    );
    expect(host.textContent).toContain('2Y–10Y spread · inverted');
  });
});
