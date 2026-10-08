import { describe, expect, it } from 'vitest';
import { createBrushGesture } from './brush-gesture';

describe('brush gesture cancellation', () => {
  it('keeps the committed range when Escape cancels a drag before pointer-up', () => {
    const gesture = createBrushGesture();
    gesture.start({ kind: 'end', anchor: 7, start: 3, end: 7, pointerId: 2 });
    expect(gesture.move(12, 20)).toEqual([3, 12]);
    gesture.cancel();
    expect(gesture.finish(12, 20)).toBeNull();
    gesture.start({ kind: 'start', anchor: 3, start: 3, end: 7, pointerId: 3 });
    expect(gesture.finish(5, 20)).toEqual([5, 7]);
  });
});
