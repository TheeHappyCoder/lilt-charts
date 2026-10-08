import { act } from 'react';
import { vi } from 'vitest';

/**
 * Animation frames that run only when a test steps them, at the time it chooses, so a test can
 * look at any moment of a transition. Returns `step(to)`: set the clock to `to` milliseconds and
 * run every frame queued so far.
 */
export function manualFrames() {
  let now = 0;
  let queue: FrameRequestCallback[] = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  return async (to: number) => {
    now = to;
    const run = queue;
    queue = [];
    await act(async () => run.forEach((callback) => callback(now)));
  };
}
