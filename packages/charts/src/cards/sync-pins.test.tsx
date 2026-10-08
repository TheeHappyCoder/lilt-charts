// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AreaChartCard } from './area-chart-card';
import { LineChartCard } from './line-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 300)));

async function click(plot: Element, clientX: number, altKey = false) {
  await act(async () => {
    plot.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX,
        clientY: 120,
        pointerType: 'mouse',
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    // A real click: press, release, then click, as the browser sends them.
    const at = { bubbles: true, clientX, clientY: 120, altKey, pointerType: 'mouse' };
    plot.dispatchEvent(new PointerEvent('pointerdown', at));
    plot.dispatchEvent(new PointerEvent('pointerup', at));
    plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY: 120, altKey }));
  });
  await settle();
}

async function press(target: Element, altKey = false) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', altKey }));
  });
  await settle();
}

const day = (index: number) => new Date(Date.UTC(2026, 8, 1 + index));
const daily = Array.from({ length: 6 }, (_, index) => ({
  date: day(index),
  revenue: 100 + index * 10,
  users: 20 + index,
}));

function Linked() {
  return (
    <div>
      <AreaChartCard
        motion="none"
        title="Revenue"
        data={daily}
        x="date"
        series={[{ key: 'revenue' }]}
        sync="pins"
      />
      <LineChartCard
        motion="none"
        title="Users"
        data={daily}
        x="date"
        series={[{ key: 'users' }]}
        sync="pins"
      />
    </div>
  );
}

const pinOf = (card: Element) => card.querySelector<HTMLButtonElement>('.lilt-chart__pin');

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
});
afterEach(() => vi.restoreAllMocks());

describe('pins across linked cards', { timeout: 20_000 }, () => {
  it('pins every linked card, and shows the others a ghost of the pin', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);

      const own = pinOf(revenue!)!;
      expect(own.dataset.ghost).toBeUndefined();
      expect(own.getAttribute('aria-label')).toBe('Release pinned point');

      const ghost = pinOf(users!)!;
      expect(ghost.dataset.ghost).toBe('true');
      expect(ghost.title).toBe('Pinned from Revenue. Click to release.');
      // Keyboard and screen reader users meet one pin, not one per card.
      expect(ghost.getAttribute('aria-hidden')).toBe('true');
      expect(ghost.tabIndex).toBe(-1);
      expect(users!.querySelector('.lilt-card__caption')?.textContent).toBe('Sep 6');
    } finally {
      unmount();
    }
  });

  it('moves the group pin when another linked card is clicked, without dropping any marker', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      const before = [pinOf(revenue!), pinOf(users!)];
      // A marker leaving and coming back is the blur-and-jump; moving keeps the same element.
      const removed: Node[] = [];
      const observer = new MutationObserver((records) =>
        records.forEach((record) =>
          record.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement && node.matches('.lilt-chart__pin')) removed.push(node);
          }),
        ),
      );
      observer.observe(host, { childList: true, subtree: true });
      await click(users!.querySelector('.lilt-chart__svg')!, 10);
      observer.disconnect();

      expect(removed).toHaveLength(0);
      expect([pinOf(revenue!), pinOf(users!)]).toEqual(before);
      // The pin now belongs to the card that was clicked; the first card follows it.
      expect(pinOf(users!)?.dataset.ghost).toBeUndefined();
      expect(pinOf(revenue!)?.dataset.ghost).toBe('true');
      expect(pinOf(revenue!)?.title).toBe('Pinned from Users. Click to release.');
      expect(revenue!.querySelector('.lilt-card__caption')?.textContent).toBe('Sep 1');
    } finally {
      unmount();
    }
  });

  it('moves a shared pin in place, so every line glides instead of starting over', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      const lines = [...host.querySelectorAll('.lilt-chart__crosshair')];
      expect(lines).toHaveLength(2);
      // Pressing to move the pin is not an outside press for the linked card following it.
      await click(revenue!.querySelector('.lilt-chart__svg')!, 10);
      expect([...host.querySelectorAll('.lilt-chart__crosshair')]).toEqual(lines);
      await click(users!.querySelector('.lilt-chart__svg')!, 690);
      expect([...host.querySelectorAll('.lilt-chart__crosshair')]).toEqual(lines);
    } finally {
      unmount();
    }
  });

  it('moves a shared pin when a finger taps a linked chart, instead of releasing it', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      const lines = [...host.querySelectorAll('.lilt-chart__crosshair')];
      const finger = (type: string) =>
        new PointerEvent(type, {
          bubbles: true,
          clientX: 10,
          clientY: 120,
          pointerId: 7,
          pointerType: 'touch',
        });
      const plot = users!.querySelector('.lilt-chart__svg')!;
      await act(async () => {
        plot.dispatchEvent(finger('pointerdown'));
        plot.dispatchEvent(finger('pointerup'));
        plot.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 120 }));
      });
      await settle();
      // The tapped chart now owns the pin; the first follows it, and no line was recreated.
      expect(pinOf(users!)?.dataset.ghost).toBeUndefined();
      expect(pinOf(revenue!)?.dataset.ghost).toBe('true');
      expect(revenue!.querySelector('.lilt-card__caption')?.textContent).toBe('Sep 1');
      expect([...host.querySelectorAll('.lilt-chart__crosshair')]).toEqual(lines);
    } finally {
      unmount();
    }
  });

  it('ends a swipe with every linked chart pinned where the finger lifts', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      const plot = revenue!.querySelector('.lilt-chart__svg')!;
      const finger = (type: string, clientX: number) =>
        new PointerEvent(type, {
          bubbles: true,
          clientX,
          clientY: 120,
          pointerId: 7,
          pointerType: 'touch',
        });
      await act(async () => {
        plot.dispatchEvent(finger('pointerdown', 600));
        for (let step = 1; step <= 6; step += 1) {
          plot.dispatchEvent(finger('pointermove', 600 - step * 100));
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        plot.dispatchEvent(finger('pointerup', 10));
        plot.dispatchEvent(finger('pointerleave', 10));
      });
      await settle();
      expect(pinOf(revenue!)?.dataset.ghost).toBeUndefined();
      expect(pinOf(users!)?.dataset.ghost).toBe('true');
      expect(users!.querySelector('.lilt-card__caption')?.textContent).toBe('Sep 1');
    } finally {
      unmount();
    }
  });

  it('still lets go when the press lands outside every linked chart', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      await act(async () => {
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      await settle();
      expect(pinOf(revenue!)).toBeNull();
      expect(pinOf(users!)).toBeNull();
    } finally {
      unmount();
    }
  });

  it('releases the whole group from a ghost', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      await act(async () => pinOf(users!)!.click());
      await settle();
      expect(pinOf(revenue!)).toBeNull();
      expect(pinOf(users!)).toBeNull();
    } finally {
      unmount();
    }
  });

  it('pins one card only with Alt-click, and leaves linked cards free', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690, true);
      expect(pinOf(revenue!)?.dataset.local).toBe('true');
      expect(pinOf(revenue!)?.title).toBe('Release pin on this chart');
      expect(pinOf(users!)).toBeNull();
      // A click inside a solo-pinned card moves its solo pin.
      await click(revenue!.querySelector('.lilt-chart__svg')!, 10);
      expect(pinOf(revenue!)?.dataset.local).toBe('true');
      expect(pinOf(users!)).toBeNull();
    } finally {
      unmount();
    }
  });

  it('keeps a solo pin when the group pin elsewhere is released', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      await click(revenue!.querySelector('.lilt-chart__svg')!, 690);
      // Alt-click on a card following the group turns that card solo.
      await click(users!.querySelector('.lilt-chart__svg')!, 10, true);
      expect(pinOf(users!)?.dataset.local).toBe('true');
      expect(pinOf(users!)?.dataset.ghost).toBeUndefined();
      expect(pinOf(revenue!)?.dataset.ghost).toBeUndefined();

      await act(async () => pinOf(revenue!)!.click());
      await settle();
      expect(pinOf(revenue!)).toBeNull();
      expect(pinOf(users!)?.dataset.local).toBe('true');
    } finally {
      unmount();
    }
  });

  it('pins from the keyboard: Enter for the group, Alt+Enter for this card', async () => {
    const { host, unmount } = await render(<Linked />);
    try {
      await settle();
      const [revenue, users] = [...host.querySelectorAll('.lilt-card')];
      const input = revenue!.querySelector('input[type="range"]')!;
      await press(input);
      expect(pinOf(revenue!)?.dataset.local).toBeUndefined();
      expect(pinOf(users!)?.dataset.ghost).toBe('true');

      await press(input, true);
      expect(pinOf(revenue!)?.dataset.local).toBe('true');
      expect(pinOf(users!)).toBeNull();
    } finally {
      unmount();
    }
  });
});
