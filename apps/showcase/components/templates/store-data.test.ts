import { describe, expect, it } from 'vitest';
import { storeCsv, storePeriods, storeSummary } from './store-data';

const cents = (value: number) => Math.round(value * 100);

describe('store report', () => {
  it.each(storePeriods)('keeps the %i-day cards, tables and export consistent', (period) => {
    const report = storeSummary(period);
    expect(report.days).toHaveLength(period);
    expect(report.days.at(-1)?.date.toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(report.products.reduce((total, row) => total + cents(row.revenue), 0)).toBe(
      cents(report.revenue),
    );
    expect(report.products.reduce((total, row) => total + row.units, 0)).toBe(report.units);
    expect(report.markets.reduce((total, row) => total + row.customers, 0)).toBe(report.customers);
    expect(report.sources.reduce((total, row) => total + row.sessions, 0)).toBe(report.sessions);
    expect(report.days.reduce((total, day) => total + day.firstTime + day.returning, 0)).toBe(
      report.orders,
    );
    expect(report.conversion).toBe(report.orders / report.sessions);
    const csv = storeCsv(report.days).split('\r\n').slice(1);
    expect(csv).toHaveLength(period);
    expect(csv.reduce((total, row) => total + cents(Number(row.split(',')[1])), 0)).toBe(
      cents(report.revenue),
    );
    expect(csv.reduce((total, row) => total + Number(row.split(',')[2]), 0)).toBe(report.orders);
  });

  it.each(storePeriods)('tells the same story over %i days', (period) => {
    const report = storeSummary(period);
    // The store keeps growing; over a month or more, social is the source growing fastest
    // (in the last week it cools after the launch).
    expect(report.revenueChange).toBeGreaterThan(0);
    const fastest = [...report.sources].sort((a, b) => b.change - a.change)[0]!;
    if (period !== 7) expect(fastest.source).toBe('Social');
    // A week of forecast follows the last measured day.
    const forecast = report.revenueRows.slice(period);
    expect(forecast).toHaveLength(7);
    expect(forecast[0]!.date.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(forecast.every((row) => row.low < row.revenue && row.revenue < row.high)).toBe(true);
  });

  it('makes the Autumn drop the best day once it is in view', () => {
    for (const period of [30, 90] as const) {
      const { best, launchInPeriod } = storeSummary(period);
      expect(launchInPeriod).toBe(true);
      expect(best.isLaunch).toBe(true);
    }
    expect(storeSummary(7).launchInPeriod).toBe(false);
  });
});
