import { describe, expect, it } from 'vitest';
import { tileAreas, treemapLayout } from './treemap-chart-card';
import { calendarLayout, utcDate } from './calendar-heatmap-card';
import { intervalTime, timelineLayout } from './timeline-chart-card';
import { stripLayout, swarmOffsets } from './strip-chart-card';

describe('treemap geometry', () => {
  it('partitions every pixel in proportion to area without overlaps', () => {
    const values = [3, 7, 13, 19, 58];
    const tiles = tileAreas(values, (value) => value, { x: 0, y: 0, width: 600, height: 240 });
    for (const tile of tiles) {
      expect(tile.rect.width * tile.rect.height).toBeCloseTo((tile.item / 100) * 600 * 240, 6);
      expect(tile.rect.x + tile.rect.width).toBeLessThanOrEqual(600);
      expect(tile.rect.y + tile.rect.height).toBeLessThanOrEqual(240);
      for (const other of tiles.filter((candidate) => candidate !== tile)) {
        const dx =
          Math.min(tile.rect.x + tile.rect.width, other.rect.x + other.rect.width) -
          Math.max(tile.rect.x, other.rect.x);
        const dy =
          Math.min(tile.rect.y + tile.rect.height, other.rect.y + other.rect.height) -
          Math.max(tile.rect.y, other.rect.y);
        expect(dx <= 0.000001 || dy <= 0.000001).toBe(true);
      }
    }
  });
  it('keeps missing and zero readings without giving them positive area', () => {
    const data = [
      { name: 'A', group: 'Team', value: 20 },
      { name: 'B', group: 'Team', value: 0 },
      { name: 'C', group: 'Other', value: null },
    ];
    const scene = treemapLayout(data, 'name', 'value', 'group', 600, 240);
    expect(scene.marks).toHaveLength(1);
    expect(scene.readings?.map((row) => row.value)).toEqual([20, 0, null]);
    expect(treemapLayout([...data, data[0]!], 'name', 'value', 'group', 600, 240).error).toMatch(
      /unique/,
    );
    expect(
      treemapLayout([{ name: 'A', value: -1 }], 'name', 'value', undefined, 600, 240).error,
    ).toMatch(/nonnegative/);
  });
});

describe('UTC calendar geometry', () => {
  it.each([310, 600, 1100])('fills the plot at %i px without changing the day layout', (width) => {
    const scene = calendarLayout([], '', '', width, 200, {
      from: '2026-07-01',
      to: '2026-10-10',
    });
    expect(scene.marks).toHaveLength(102);
    expect(scene.width).toBeCloseTo(width);
    expect(scene.height).toBeCloseTo(200);
    expect(Math.max(...scene.marks.map((mark) => mark.x + mark.width))).toBeCloseTo(width);
    expect(Math.max(...scene.marks.map((mark) => mark.y + mark.height))).toBeCloseTo(200);
    for (const mark of scene.marks) {
      expect(mark.width).toBeGreaterThanOrEqual(8);
      expect(mark.height).toBeGreaterThanOrEqual(8);
    }
    const monday = scene.marks.find((mark) => mark.id === '2026-07-06')!;
    const nextMonday = scene.marks.find((mark) => mark.id === '2026-07-13')!;
    expect(monday.y).toBe(nextMonday.y);
    expect(nextMonday.x - monday.x - monday.width).toBeCloseTo(4);
  });
  it('keeps long mobile ranges readable by scrolling instead of shrinking days away', () => {
    const scene = calendarLayout([], '', '', 310, 200, {
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(scene.width).toBeGreaterThan(310);
    expect(Math.max(...scene.marks.map((mark) => mark.x + mark.width))).toBeCloseTo(scene.width!);
    expect(scene.marks.every((mark) => mark.width >= 8)).toBe(true);
  });
  it('includes leap days, keeps zero colored, and distinguishes missing and future days', () => {
    const scene = calendarLayout([{ date: '2024-02-28', value: 0 }], 'date', 'value', 600, 200, {
      from: '2024-02-28',
      to: '2024-03-02',
      today: '2024-02-29',
    });
    expect(scene.marks.map((mark) => mark.id)).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
      '2024-03-02',
    ]);
    expect(scene.marks[0]?.missing).toBe(false);
    expect(scene.marks[0]?.color).toContain('12%');
    expect(scene.marks[1]?.missing).toBe(true);
    expect(scene.marks[2]?.future).toBe(true);
    expect(scene.marks[0]?.x).toBe(scene.marks[1]?.x);
    expect(scene.marks[1]!.y).toBeGreaterThan(scene.marks[0]!.y);
  });
  it('aligns the first day and rolls weeks on the requested weekday', () => {
    const monday = calendarLayout([], '', '', 560, 220, {
      from: '2024-01-01',
      to: '2024-01-08',
      weekStartsOn: 1,
    });
    expect(monday.marks[0]?.y).toBe(24);
    expect(monday.marks[7]?.y).toBe(24);
    expect(monday.marks[7]!.x).toBeGreaterThan(monday.marks[0]!.x);
    const sunday = calendarLayout([], '', '', 560, 220, {
      from: '2024-01-01',
      to: '2024-01-08',
      weekStartsOn: 0,
    });
    expect(sunday.marks[0]!.y).toBeGreaterThan(24);
    expect(sunday.marks[6]?.y).toBe(24);
  });
  it('rejects invalid dates, duplicates, bounds and a domain that would conceal data', () => {
    expect(utcDate('2024-02-30')).toBeNull();
    expect(utcDate(1e20)).toBeNull();
    const rows = [{ date: '2024-01-01', value: 10 }];
    expect(calendarLayout([...rows, ...rows], 'date', 'value', 300, 200).error).toMatch(/one row/);
    expect(calendarLayout(rows, 'date', 'value', 300, 200, { domain: [0, 5] }).error).toMatch(
      /domain/,
    );
    expect(
      calendarLayout(rows, 'date', 'value', 300, 200, { from: '2024-02-01', to: '2024-01-01' })
        .error,
    ).toMatch(/ordered/);
  });
});

describe('timeline geometry', () => {
  const rows = [
    { id: 'a', task: 'A', lane: 'API', start: 0, end: 10 },
    { id: 'b', task: 'B', lane: 'API', start: 5, end: 20 },
    { id: 'c', task: 'C', lane: 'API', start: 10, end: 20 },
  ];
  const options = { label: 'task', id: 'id', start: 'start', end: 'end', lane: 'lane' } as const;
  it('stacks overlapping intervals and reuses lanes for adjacent ones', () => {
    const scene = timelineLayout(rows, options, 600, 220, String);
    expect(scene.marks[0]?.y).not.toBe(scene.marks[1]?.y);
    expect(scene.marks[0]?.y).toBe(scene.marks[2]?.y);
    expect(scene.marks[0]!.x + scene.marks[0]!.width).toBeCloseTo(scene.marks[2]!.x);
    expect(scene.marks[1]!.width / scene.marks[0]!.width).toBeCloseTo(1.5);
  });
  it('rejects reversed intervals and preserves missing endpoints without turning them into epoch zero', () => {
    expect(intervalTime(null)).toBeNull();
    expect(intervalTime('2024-02-30')).toBeNull();
    expect(intervalTime('2024-01-01T12:30:00')).toBe(Date.UTC(2024, 0, 1, 12, 30));
    expect(timelineLayout([{ ...rows[0]!, end: -1 }], options, 600, 220, String).error).toMatch(
      /before/,
    );
    const scene = timelineLayout([{ ...rows[0]!, start: null }], options, 600, 220, String);
    expect(scene.marks).toEqual([]);
    expect(scene.readings?.[0]?.value).toBeNull();
  });
});

describe('strip and beeswarm geometry', () => {
  it('avoids every collision even when many values are identical', () => {
    const positions = [0, 0, 0, 0, 2, 3, 5, 8, 8, 8, 9, 10];
    const offsets = swarmOffsets(positions, 9.5);
    expect(swarmOffsets(positions, 9.5)).toEqual(offsets);
    positions.forEach((x, i) =>
      positions.slice(0, i).forEach((otherX, j) => {
        expect(Math.hypot(x - otherX, offsets[i]! - offsets[j]!)).toBeGreaterThanOrEqual(9.49);
      }),
    );
  });
  it('changes only perpendicular offsets between strip and beeswarm, preserving zero and negatives', () => {
    const rows = [-2, 0, 0, 0, 2, null].map((value, index) => ({
      name: String(index),
      category: 'A',
      value,
    }));
    const strip = stripLayout(rows, 'category', 'value', 'name', 500, 180, 'strip', 4, String);
    const swarm = stripLayout(rows, 'category', 'value', 'name', 500, 180, 'beeswarm', 4, String);
    expect(strip.marks.map((mark) => mark.x)).toEqual(swarm.marks.map((mark) => mark.x));
    expect(swarm.marks).toHaveLength(5);
    expect(swarm.readings).toHaveLength(6);
    expect(swarm.note).toContain('1 point is');
    for (const mark of swarm.marks) {
      expect(mark.y).toBeGreaterThanOrEqual(0);
      expect(mark.y + mark.height).toBeLessThan(swarm.height!);
    }
  });
});
