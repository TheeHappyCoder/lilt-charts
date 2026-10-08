import { describe, expect, it } from 'vitest';
import { createLifecycleGeneration, durationForPhase, skipDataTweenForWorkload } from './lifecycle';

describe('lifecycle generations', () => {
  it('cancels stale completion work when a newer target starts', () => {
    const generation = createLifecycleGeneration();
    const first = generation.next();
    const second = generation.next();
    expect(generation.isCurrent(first)).toBe(false);
    expect(generation.isCurrent(second)).toBe(true);
    expect(generation.current()).toBe(second);
  });

  it('uses the documented finite clocks and reduced-motion commit', () => {
    expect(durationForPhase('initial', false)).toBe(720);
    expect(durationForPhase('matched-update', false)).toBe(420);
    expect(durationForPhase('topology-update', false)).toBe(240);
  });

  it('can skip entrances without disabling data-update motion', () => {
    expect(durationForPhase('initial', false, false)).toBe(0);
    expect(durationForPhase('matched-update', false, false)).toBe(420);
    expect(durationForPhase('topology-update', false, false)).toBe(240);
    expect(durationForPhase('matched-update', true, true)).toBe(0);
  });

  it('commits dense and rapidly repeated updates without per-sample tweening', () => {
    expect(skipDataTweenForWorkload(12000, Infinity)).toBe(true);
    expect(skipDataTweenForWorkload(1200, 125)).toBe(true);
    expect(skipDataTweenForWorkload(1200, 240)).toBe(false);
  });
});
