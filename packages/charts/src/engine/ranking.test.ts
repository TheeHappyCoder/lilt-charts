import { describe, expect, it } from 'vitest';
import { normalizeRanking, orderRanking, rankingBar, rankingDomain } from './ranking';

type Row = { id: string; value: number | null };
const category = { id: (row: Row) => row.id, label: (row: Row) => row.id };
const normalize = (rows: Row[]) => normalizeRanking(rows, category, (row) => row.value);

describe('category rankings', () => {
  it('sorts by value without replacing category identity and resolves ties consistently', () => {
    const a = { id: 'a', value: 20 };
    const b = { id: 'b', value: 10 };
    const first = orderRanking(normalize([a, b]), 'descending');
    const updated = orderRanking(
      normalize([
        { ...a, value: 4 },
        { ...b, value: 30 },
      ]),
      'descending',
    );
    expect(first.map((row) => row.id)).toEqual(['a', 'b']);
    expect(first[0].datum).toBe(a);
    expect(updated.map((row) => row.id)).toEqual(['b', 'a']);
    const ties = normalize([
      { id: 'b', value: 10 },
      { id: 'a', value: 10 },
    ]);
    expect(orderRanking(ties, 'descending').map((row) => row.id)).toEqual(['a', 'b']);
    expect(orderRanking(ties, 'input').map((row) => row.id)).toEqual(['b', 'a']);
  });
  it('keeps unknown values at the bottom while measured zero remains a ranked value', () => {
    const rows = normalize([
      { id: 'missing', value: null },
      { id: 'zero', value: 0 },
      { id: 'loss', value: -2 },
    ]);
    expect(orderRanking(rows, 'descending').map((row) => row.id)).toEqual([
      'zero',
      'loss',
      'missing',
    ]);
    expect(orderRanking(rows, 'ascending').map((row) => row.id)).toEqual([
      'loss',
      'zero',
      'missing',
    ]);
  });
  it('uses an exact shared zero for signed bars and finite geometry for empty/zero domains', () => {
    const domain = rankingDomain(
      normalize([
        { id: 'a', value: -10 },
        { id: 'b', value: 30 },
      ]),
    );
    expect(domain).toEqual([-10, 30]);
    expect(rankingBar(-10, domain)).toEqual({ zero: 25, left: 0, width: 25 });
    expect(rankingBar(30, domain)).toEqual({ zero: 25, left: 25, width: 75 });
    expect(rankingBar(0, domain).width).toBe(0);
    expect(rankingDomain(normalize([{ id: 'a', value: 0 }]))).toEqual([0, 1]);
    expect(rankingBar(null, rankingDomain([]))).toEqual({ zero: 0, left: 0, width: 0 });
  });
  it('rejects duplicate or empty identities and non-finite values', () => {
    expect(() =>
      normalize([
        { id: 'a', value: 2 },
        { id: 'a', value: 3 },
      ]),
    ).toThrow('Duplicate category');
    expect(() => normalize([{ id: '', value: 2 }])).toThrow('non-empty string ID');
    expect(() => normalize([{ id: 'a', value: Infinity }])).toThrow('finite number or null');
  });
});
