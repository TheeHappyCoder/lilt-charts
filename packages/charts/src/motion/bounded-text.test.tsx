// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoundedText } from './bounded-text';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Frames = { transform: string }[];

describe('bounded text', () => {
  let animate: ReturnType<typeof vi.fn>;
  let now = 0;
  beforeEach(() => {
    animate = vi.fn();
    (HTMLElement.prototype as { animate?: unknown }).animate = animate;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
    vi.restoreAllMocks();
  });

  async function scrub(axis: 'x' | 'y', steps: readonly [number, string][]) {
    const host = document.createElement('div');
    const root = createRoot(host);
    const seen: { from: string; out: string | undefined }[] = [];
    for (const [position, value] of steps) {
      now += 200;
      await act(async () =>
        root.render(
          <BoundedText axis={axis} duration={160} offset={6} position={position} value={value} />,
        ),
      );
      const call = animate.mock.calls.at(-1);
      const outgoing = host.querySelector<HTMLElement>('.lilt-bounded-text__outgoing');
      seen.push({
        from: call ? (call[0] as Frames)[0]!.transform : 'none',
        out: outgoing?.style.getPropertyValue(
          axis === 'x' ? '--lilt-text-out-x' : '--lilt-text-out-y',
        ),
      });
    }
    await act(async () => root.unmount());
    return seen;
  }

  it('slides a new date in from the side the pointer moves toward, the old one out the other', async () => {
    const [, right, left] = await scrub('x', [
      [1, 'Mon'],
      [2, 'Tue'],
      [1, 'Mon'],
    ]);
    expect(right).toEqual({ from: 'translate(6px, 0px)', out: '-6px' });
    expect(left).toEqual({ from: 'translate(-6px, 0px)', out: '6px' });
  });

  it('brings a higher value in from above and a lower one from below', async () => {
    const [, up, down] = await scrub('y', [
      [10, '10'],
      [20, '20'],
      [5, '5'],
    ]);
    expect(up).toEqual({ from: 'translate(0px, -6px)', out: '6px' });
    expect(down).toEqual({ from: 'translate(0px, 6px)', out: '-6px' });
  });

  it('holds still with no duration', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    await act(async () =>
      root.render(<BoundedText axis="x" duration={0} position={1} value="a" />),
    );
    await act(async () =>
      root.render(<BoundedText axis="x" duration={0} position={2} value="b" />),
    );
    expect(animate).not.toHaveBeenCalled();
    expect(host.querySelector('.lilt-bounded-text__outgoing')).toBeNull();
    await act(async () => root.unmount());
  });
});
