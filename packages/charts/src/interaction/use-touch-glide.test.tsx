// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityRingCard } from '../cards/activity-ring-card';
import { HorizontalBarChartCard } from '../cards/horizontal-bar-chart-card';
import { RadarChartCard } from '../cards/radar-chart-card';
import { glideTarget, TOUCH_HOLD_MS, useTouchGlide } from './use-touch-glide';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

async function render(element: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const wait = (ms: number) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));

const touch = (type: string, clientX: number, clientY: number) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    pointerId: 3,
    pointerType: 'touch',
    isPrimary: true,
  });

async function send(target: Element, type: string, clientX: number, clientY = 0) {
  await act(async () => {
    target.dispatchEvent(touch(type, clientX, clientY));
  });
  // Glides are drawn a frame at a time.
  if (type === 'pointermove') await wait(30);
}

/** Five items side by side, 100px each; the finger reads which one it is over by its x. */
function Strip({ onClick }: { onClick: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const ref = useTouchGlide<string>({
    resolve: (clientX) =>
      clientX < 0 || clientX >= 500 ? null : `item-${Math.floor(clientX / 100)}`,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
  });
  return (
    <div ref={ref} data-testid="strip" data-hovered={hovered ?? ''} data-pinned={pinned ?? ''}>
      {Array.from({ length: 5 }, (_, index) => (
        <button key={index} type="button" onClick={() => onClick(`item-${index}`)}>
          {index}
        </button>
      ))}
    </div>
  );
}

describe('useTouchGlide', { timeout: 20_000 }, () => {
  afterEach(() => vi.restoreAllMocks());

  it('glides with a sideways swipe and pins where the finger lifts', async () => {
    const clicked = vi.fn();
    const { host, unmount } = await render(<Strip onClick={clicked} />);
    try {
      const strip = host.querySelector<HTMLElement>('[data-testid="strip"]')!;
      await send(strip, 'pointerdown', 50);
      await send(strip, 'pointermove', 150);
      expect(strip.dataset.hovered).toBe('item-1');
      await send(strip, 'pointermove', 350);
      expect(strip.dataset.hovered).toBe('item-3');
      await send(strip, 'pointerup', 350);
      expect(strip.dataset.hovered).toBe('');
      expect(strip.dataset.pinned).toBe('item-3');
      // The click the browser sends after the lift must not undo the pin.
      await act(async () => {
        strip.querySelectorAll('button')[0]!.click();
      });
      expect(clicked).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it('leaves a vertical swipe to the page', async () => {
    const { host, unmount } = await render(<Strip onClick={() => {}} />);
    try {
      const strip = host.querySelector<HTMLElement>('[data-testid="strip"]')!;
      await send(strip, 'pointerdown', 50, 0);
      await send(strip, 'pointermove', 52, 40);
      expect(strip.dataset.hovered).toBe('');
      // The page scrolls, so the browser cancels the pointer.
      await send(strip, 'pointercancel', 52, 40);
      await wait(TOUCH_HOLD_MS + 50);
      expect(strip.dataset.hovered).toBe('');
      expect(strip.dataset.pinned).toBe('');
    } finally {
      unmount();
    }
  });

  it('glides in any direction after a press and hold, holding the page still', async () => {
    const { host, unmount } = await render(<Strip onClick={() => {}} />);
    try {
      const strip = host.querySelector<HTMLElement>('[data-testid="strip"]')!;
      await send(strip, 'pointerdown', 250, 0);
      await wait(TOUCH_HOLD_MS + 50);
      expect(strip.dataset.hovered).toBe('item-2');
      const scroll = new Event('touchmove', { bubbles: true, cancelable: true });
      strip.dispatchEvent(scroll);
      expect(scroll.defaultPrevented).toBe(true);
      // Straight down is a glide now, not a scroll.
      await send(strip, 'pointermove', 250, 80);
      await send(strip, 'pointermove', 460, 80);
      expect(strip.dataset.hovered).toBe('item-4');
    } finally {
      unmount();
    }
  });

  it('leaves taps to the marks, and does nothing for a mouse', async () => {
    const clicked = vi.fn();
    const { host, unmount } = await render(<Strip onClick={clicked} />);
    try {
      const strip = host.querySelector<HTMLElement>('[data-testid="strip"]')!;
      await send(strip, 'pointerdown', 150);
      await send(strip, 'pointerup', 150);
      await act(async () => {
        strip.querySelectorAll('button')[1]!.click();
      });
      expect(clicked).toHaveBeenCalledWith('item-1');
      expect(strip.dataset.pinned).toBe('');

      await act(async () => {
        strip.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX: 50, pointerType: 'mouse' }),
        );
        strip.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 350, pointerType: 'mouse' }),
        );
      });
      await wait(30);
      expect(strip.dataset.hovered).toBe('');
    } finally {
      unmount();
    }
  });

  it('finds the mark under the finger by its glide id', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button data-glide-id="a"><span>A</span></button>';
    document.body.append(root);
    const span = root.querySelector('span')!;
    document.elementFromPoint = () => span;
    expect(glideTarget(0, 0, root)).toBe('a');
    const outside = document.createElement('button');
    outside.dataset.glideId = 'b';
    document.body.append(outside);
    document.elementFromPoint = () => outside;
    expect(glideTarget(0, 0, root)).toBeNull();
    root.remove();
    outside.remove();
  });
});

describe('touch on category charts', { timeout: 20_000 }, () => {
  beforeEach(() => {
    document.elementFromPoint = () => null;
  });

  it('glides down a ranked list after a press and hold, and pins the last row', async () => {
    const { host, unmount } = await render(
      <HorizontalBarChartCard
        motion="none"
        title="Revenue"
        data={[
          { channel: 'Organic', revenue: 50 },
          { channel: 'Direct', revenue: 30 },
          { channel: 'Email', revenue: 20 },
        ]}
        category="channel"
        value="revenue"
      />,
    );
    try {
      const list = host.querySelector('.lilt-list__rows')!;
      const rows = [...host.querySelectorAll<HTMLButtonElement>('.lilt-list__row')];
      // Rows stack 40px apart.
      document.elementFromPoint = (_x, y) => rows[Math.min(rows.length - 1, Math.floor(y / 40))]!;
      await send(rows[0]!, 'pointerdown', 100, 10);
      await wait(TOUCH_HOLD_MS + 50);
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Organic · 50%');
      await send(list, 'pointermove', 100, 90);
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Email · 20%');
      await send(list, 'pointerup', 100, 90);
      await act(async () => rows[0]!.click());
      expect(rows.map((row) => row.getAttribute('aria-pressed'))).toEqual([
        'false',
        'false',
        'true',
      ]);
    } finally {
      unmount();
    }
  });

  it('pins a radar dimension with a tap, though a finger never hovers first', async () => {
    const { host, unmount } = await render(
      <RadarChartCard
        motion="none"
        title="Scores"
        data={[
          { area: 'Quality', current: 78 },
          { area: 'Coverage', current: 72 },
          { area: 'Accessibility', current: 81 },
          { area: 'Reliability', current: 84 },
          { area: 'Delivery', current: 65 },
        ]}
        category="area"
        series={[{ key: 'current', label: 'Current' }]}
        height={300}
      />,
    );
    try {
      const plot = host.querySelector('.lilt-radar-card__plot')!;
      // jsdom lays the card out at its 480px fallback, centered at (240, 150).
      await send(plot, 'pointerdown', 330, 120);
      await send(plot, 'pointerup', 330, 120);
      await act(async () => {
        plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 330, clientY: 120 }));
      });
      expect(host.querySelector('.lilt-card__caption')?.textContent).toContain('Coverage');
      // A second tap on the same spoke lets it go.
      await send(plot, 'pointerdown', 330, 120);
      await send(plot, 'pointerup', 330, 120);
      expect(host.querySelector('.lilt-card__caption')).toBeNull();
    } finally {
      unmount();
    }
  });
});

describe('touch on the activity ring', { timeout: 20_000 }, () => {
  afterEach(() => vi.restoreAllMocks());

  it('circles the ring by angle and pins the slot where the finger lifts', async () => {
    const { host, unmount } = await render(
      <ActivityRingCard
        motion="none"
        title="Request rhythm"
        data={[
          { hour: 0, requests: 10 },
          { hour: 4, requests: 0 },
          { hour: 8, requests: null },
          { hour: 12, requests: 60 },
          { hour: 16, requests: 90 },
          { hour: 20, requests: 40 },
        ]}
        hour="hour"
        value="requests"
        bucketMinutes={240}
      />,
    );
    try {
      const svg = host.querySelector('svg[data-lilt-glide]')!;
      vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
        toJSON: () => ({}),
      } as DOMRect);
      const caption = () => host.querySelector('.lilt-card__caption')?.textContent;
      // Down at twelve o'clock, then round to the 04:00 spoke, a sixth of a turn clockwise.
      await send(svg, 'pointerdown', 150, 60);
      await send(svg, 'pointermove', 170, 62);
      expect(caption()).toBe('00:00 · requests');
      const turn = Math.PI / 3;
      await send(svg, 'pointermove', 150 + 90 * Math.sin(turn), 150 - 90 * Math.cos(turn));
      expect(caption()).toBe('04:00 · requests');
      await send(svg, 'pointerup', 150 + 90 * Math.sin(turn), 150 - 90 * Math.cos(turn));
      expect(caption()).toBe('04:00 · requests');
      expect(host.querySelector('[data-hour="1"]')?.hasAttribute('data-active')).toBe(true);
    } finally {
      unmount();
    }
  });
});
