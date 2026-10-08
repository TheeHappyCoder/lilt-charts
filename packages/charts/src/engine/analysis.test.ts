import { describe, expect, it } from 'vitest';
import { funnelRows } from './analysis';

const category = {
  id: (row: { id: string; value: number | null }) => row.id,
  label: (row: { id: string; value: number | null }) => row.id,
};
const value = (row: { value: number | null }) => row.value;

describe('analysis chart data truth', () => {
  it('calculates step conversion and drop-off, without substituting across gaps or zero denominators', () => {
    const data = [100, 80, null, 20, 0, 0].map((value, index) => ({ id: String(index), value }));
    const rows = funnelRows({ data, category, value });
    expect(rows[1]).toMatchObject({ share: 0.8, conversion: 0.8, drop: 20 });
    expect(rows[2]).toMatchObject({ share: null, conversion: null, drop: null });
    expect(rows[3]).toMatchObject({ share: 0.2, conversion: null, drop: null });
    expect(rows[4]).toMatchObject({ share: 0, conversion: 0, drop: 20 });
    expect(rows[5].conversion).toBeNull();
    expect(() =>
      funnelRows({
        data: [
          { id: 'a', value: 10 },
          { id: 'b', value: 20 },
        ],
        category,
        value,
      }),
    ).toThrow('must not increase');
  });
});
