// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGlide } from './use-glide';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SPRING = { stiffness: 360, damping: 38, mass: 1 };

/** Frames run only when the test says so, at the timestamps it chooses. */
function frames() {
  let queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    queue = [];
  });
  return (at: number) => {
    const due = queue;
    queue = [];
    due.forEach((callback) => callback(at));
  };
}

async function mountGlide() {
  let handle: ReturnType<typeof useGlide> | null = null;
  function Probe() {
    handle = useGlide(0, SPRING);
    return null;
  }
  const host = document.createElement('div');
  const root = createRoot(host);
  await act(async () => root.render(<Probe />));
  return { glide: handle!, unmount: () => act(() => root.unmount()) };
}

afterEach(() => vi.unstubAllGlobals());

describe('useGlide', () => {
  it('advances by at most one frame after a stall, instead of skipping ahead', async () => {
    const run = frames();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const { glide, unmount } = await mountGlide();
    const [value, to] = glide;
    to(300);
    // The page stalls for 300 ms before the next frame.
    run(300);
    const afterStall = value.get();
    expect(afterStall).toBeGreaterThan(0);
    // One 1/60 s step of this spring covers well under a tenth of the way.
    expect(afterStall).toBeLessThan(30);
    // Normal frames carry it the rest of the way, and it lands exactly on the target.
    for (let time = 316; time < 3000; time += 16) run(time);
    expect(value.get()).toBe(300);
    unmount();
    vi.restoreAllMocks();
  });

  it('keeps its speed when retargeted mid-glide', async () => {
    const run = frames();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const { glide, unmount } = await mountGlide();
    const [value, to] = glide;
    to(300);
    for (let time = 16; time <= 96; time += 16) run(time);
    const before = value.get();
    to(600);
    run(112);
    // Still moving forward from where it was; no snap back or jump.
    expect(value.get()).toBeGreaterThan(before);
    expect(value.get()).toBeLessThan(before + 60);
    unmount();
    vi.restoreAllMocks();
  });

  it('reports its speed while it travels and zero once it lands', async () => {
    const run = frames();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const { glide, unmount } = await mountGlide();
    const [value, to, speed] = glide;
    to(200);
    run(16);
    run(32);
    expect(speed.get()).toBeGreaterThan(100);
    for (let time = 48; time < 3000; time += 16) run(time);
    expect(value.get()).toBe(200);
    expect(speed.get()).toBe(0);
    unmount();
    vi.restoreAllMocks();
  });

  it('jumps straight to the target when asked to, as reduced motion does', async () => {
    frames();
    const { glide, unmount } = await mountGlide();
    const [value, to] = glide;
    to(120, true);
    expect(value.get()).toBe(120);
    unmount();
  });
});
