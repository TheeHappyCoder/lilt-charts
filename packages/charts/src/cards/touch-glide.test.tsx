// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rect = {
  width: 700,
  height: 240,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 700,
  bottom: 240,
  toJSON: () => ({}),
} as DOMRect;

const frame = () => new Promise((resolve) => setTimeout(resolve, 40));
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 300)));

const touch = (type: string, clientX: number) =>
  new PointerEvent(type, {
    bubbles: true,
    clientX,
    clientY: 120,
    pointerId: 7,
    pointerType: 'touch',
  });

/** A finger down at `from`, sliding sideways to `to` and still on the glass. */
async function swipe(plot: Element, from: number, to: number) {
  await act(async () => {
    plot.dispatchEvent(touch('pointerdown', from));
    const steps = 6;
    for (let step = 1; step <= steps; step += 1) {
      plot.dispatchEvent(touch('pointermove', from + ((to - from) * step) / steps));
      await frame();
    }
  });
}

async function lift(plot: Element, clientX: number) {
  await act(async () => {
    plot.dispatchEvent(touch('pointerup', clientX));
    plot.dispatchEvent(touch('pointerleave', clientX));
  });
  await settle();
}

const day = (index: number) => new Date(Date.UTC(2026, 8, 1 + index));
const daily = Array.from({ length: 6 }, (_, index) => ({
  date: day(index),
  revenue: 100 + index * 10,
}));

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
});
afterEach(() => vi.restoreAllMocks());

describe('touch glide', { timeout: 20_000 }, () => {
  it('glides again after a lift pinned the point', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () =>
      root.render(
        <AreaChartCard
          motion="none"
          title="Revenue"
          data={daily}
          x="date"
          series={[{ key: 'revenue' }]}
        />,
      ),
    );
    try {
      await settle();
      const plot = host.querySelector('.lilt-chart__svg')!;
      const caption = () => host.querySelector('.lilt-card__caption')?.textContent;

      await swipe(plot, 100, 690);
      expect(caption()).toBe('Sep 6');
      await lift(plot, 690);
      expect(host.querySelector('.lilt-chart__pin')).not.toBeNull();

      // The second swipe must follow the finger while it is down, not wait for the lift.
      await swipe(plot, 690, 100);
      const gliding = caption();
      expect(gliding).not.toBe('Sep 6');
      await lift(plot, 100);
      expect(caption()).toBe(gliding);
      expect(host.querySelector('.lilt-chart__pin')).not.toBeNull();
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });
});
