import { describe, expect, it, vi } from 'vitest';
import { createChartController } from './chart-controller';

describe('createChartController', () => {
  it('shares normalized x state without pixels and avoids redundant publications', () => {
    const controller = createChartController();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.inspect({ x: 42, pinned: true, ownerId: 'first' });
    expect(controller.getSnapshot().inspection).toEqual({ x: 42, pinned: true, ownerId: 'first' });
    expect(listener).toHaveBeenCalledTimes(1);
    controller.inspect({ x: 42, pinned: true, ownerId: 'first' });
    expect(listener).toHaveBeenCalledTimes(1);
    controller.clearInspection('other');
    expect(controller.getSnapshot().inspection?.x).toBe(42);
    controller.clearInspection('first');
    expect(controller.getSnapshot().inspection).toBeNull();
  });

  it('retains comparison and focus for a remounted expanded chart', () => {
    const controller = createChartController();
    controller.setComparison({ startX: 1, endX: 3, series: 'revenue' });
    controller.setFocus({ startX: 1, endX: 3 });
    expect(controller.getSnapshot()).toMatchObject({
      comparison: { startX: 1, endX: 3, series: 'revenue' },
      focus: { startX: 1, endX: 3 },
    });
  });

  it('isolates frozen snapshots and copies action inputs before publication', () => {
    const first = createChartController();
    const second = createChartController();
    const listener = vi.fn();
    first.subscribe(listener);
    expect(first.getSnapshot()).not.toBe(second.getSnapshot());
    expect(Object.isFrozen(first.getSnapshot())).toBe(true);
    const focus = { startX: 1, endX: 2 };
    first.setFocus(focus);
    focus.endX = 9;
    expect(first.getSnapshot().focus?.endX).toBe(2);
    expect(Object.isFrozen(first.getSnapshot().focus)).toBe(true);
    expect(second.getSnapshot().focus).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => Object.assign(first.getSnapshot(), { focus: null })).toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cancels a queued transient owner publication without erasing a retained pin', () => {
    const queued = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queued.set(++next, callback);
      return next;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => queued.delete(id));
    try {
      const controller = createChartController();
      controller.inspect({ x: 3, pinned: false, ownerId: 'departing' });
      const obsolete = queued.values().next().value!;
      controller.releaseOwner('departing');
      obsolete(0);
      expect(controller.getSnapshot().inspection).toBeNull();
      controller.inspect({ x: 7, pinned: true, ownerId: 'departing' });
      controller.releaseOwner('departing');
      expect(controller.getSnapshot().inspection).toEqual({
        x: 7,
        pinned: true,
        ownerId: 'departing',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('clears a committed owner pin immediately without clearing another owner', () => {
    const controller = createChartController();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.inspect({ x: 1, pinned: true, ownerId: 'first' });
    controller.clearInspection('other');
    expect(controller.getSnapshot().inspection?.ownerId).toBe('first');
    controller.clearInspection('first');
    expect(controller.getSnapshot().inspection).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not cancel another owner's queued inspection", () => {
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queued.push(callback);
      return queued.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    try {
      const controller = createChartController();
      controller.inspect({ x: 7, pinned: true, ownerId: 'other' });
      controller.clearInspection('departing');
      queued[0](0);
      expect(controller.getSnapshot().inspection?.ownerId).toBe('other');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
