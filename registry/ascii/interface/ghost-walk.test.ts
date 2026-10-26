import { describe, expect, it } from 'vitest';
import {
  createGhost,
  ghostReading,
  pickSpot,
  seededRandom,
  stepGhost,
  warmthAt,
  type Ghost,
  type GhostPhase,
  type GhostWorld,
} from './ghost-walk';

const world: GhostWorld = {
  width: 1200,
  height: 700,
  fires: [
    { x: 240, y: 560, reach: 170 },
    { x: 960, y: 560, reach: 170 },
  ],
  avoid: [{ left: 300, top: 380, right: 900, bottom: 520 }],
};

/** Steps a ghost at 60 frames a second, noting each phase it passes through. */
function run(ghost: Ghost, seconds: number, rand: () => number, on = world) {
  const phases: GhostPhase[] = [ghost.phase];
  let warmest = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    stepGhost(ghost, 1 / 60, on, rand);
    if (phases.at(-1) !== ghost.phase) phases.push(ghost.phase);
    warmest = Math.max(warmest, warmthAt(on, ghost.x, ghost.y));
    if (ghost.phase === 'gone') break;
  }
  return { phases, warmest };
}

describe('ghost walk', () => {
  it('wanders to places clear of the headline and out of the fires', () => {
    const rand = seededRandom(7);
    for (let k = 0; k < 200; k++) {
      const { x, y } = pickSpot(world, rand);
      const box = world.avoid[0]!;
      expect(
        x > box.left - 24 && x < box.right + 24 && y > box.top - 24 && y < box.bottom + 24,
      ).toBe(false);
      expect(warmthAt(world, x, y)).toBe(0);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(world.width);
    }
  });

  it('freezes, shivers, rushes to the nearest fire and warms up there', () => {
    const rand = seededRandom(3);
    const ghost = createGhost(world, rand, { inside: true, temp: 0.2 });
    ghost.stay = 999;
    const { phases, warmest } = run(ghost, 8, rand);
    expect(phases).toEqual(['wander', 'shiver', 'rush', 'warm']);
    expect(warmest).toBeGreaterThan(0.5);
    // It stays by the fire until warm through, then goes back to wandering.
    while (ghost.phase === 'warm') stepGhost(ghost, 1 / 60, world, rand);
    expect(ghost.temp).toBeGreaterThan(0.95);
    expect(ghost.phase).toBe('wander');
  });

  it('says how it is doing while it shivers, rushes and warms, and keeps quiet wandering', () => {
    const rand = seededRandom(11);
    const ghost = createGhost(world, rand, { inside: true, temp: 0.9 });
    expect(ghostReading(ghost)).toBeNull();
    ghost.temp = 0.05;
    ghost.phase = 'shiver';
    expect(ghostReading(ghost)).toEqual({ text: 'freezing −10°', tone: 'frost' });
    ghost.phase = 'rush';
    expect(ghostReading(ghost)?.text.startsWith('brr')).toBe(true);
    ghost.phase = 'warm';
    ghost.temp = 0.9;
    expect(ghostReading(ghost)).toEqual({ text: 'cosy 20°', tone: 'ember' });
    ghost.scorched = 1;
    expect(ghostReading(ghost)?.tone).toBe('hot');
  });

  it('leaves through an edge when its stay is up', () => {
    const rand = seededRandom(5);
    const ghost = createGhost(world, rand, { inside: true, temp: 0.9 });
    ghost.stay = 0.5;
    const { phases } = run(ghost, 30, rand);
    expect(phases.at(-1)).toBe('gone');
    expect(phases).toContain('leave');
  });

  it('arrives from outside the area unless placed inside', () => {
    const rand = seededRandom(9);
    for (let k = 0; k < 20; k++) {
      const ghost = createGhost(world, rand);
      const outside = ghost.x < 0 || ghost.x > world.width || ghost.y < 0;
      expect(outside).toBe(true);
      expect(ghost.alpha).toBe(0);
    }
  });

  it('never rushes anywhere without fires, and stays in bounds as it wanders', () => {
    const rand = seededRandom(13);
    const bare = { ...world, fires: [] };
    const ghost = createGhost(bare, rand, { inside: true, temp: 0.05 });
    ghost.stay = 999;
    const { phases } = run(ghost, 30, rand, bare);
    expect(phases).toEqual(['wander']);
    expect(ghost.x).toBeGreaterThan(0);
    expect(ghost.x).toBeLessThan(bare.width);
    expect(ghost.y).toBeGreaterThan(0);
    expect(ghost.y).toBeLessThan(bare.height);
  });

  it('replays the same walk from the same seed', () => {
    const a = createGhost(world, seededRandom(21), { inside: true });
    const b = createGhost(world, seededRandom(21), { inside: true });
    const ra = seededRandom(1);
    const rb = seededRandom(1);
    run(a, 10, ra);
    run(b, 10, rb);
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
    expect(a.temp).toBe(b.temp);
  });
});
