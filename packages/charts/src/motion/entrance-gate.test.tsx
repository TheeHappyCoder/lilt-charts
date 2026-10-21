// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RadialChartCard } from '../cards/radial-chart-card';
import { useChartTimeline } from './use-chart-motion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slices = [
  { browser: 'Chrome', visits: 50 },
  { browser: 'Safari', visits: 30 },
  { browser: 'Firefox', visits: 20 },
];

/** An IntersectionObserver whose entries the test delivers, with every element below the fold. */
function offScreen() {
  const observers: { callback: IntersectionObserverCallback; nodes: Element[] }[] = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      nodes: Element[] = [];
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, nodes: this.nodes });
      }
      observe(node: Element) {
        this.nodes.push(node);
      }
      disconnect() {
        this.nodes.length = 0;
      }
    },
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 2000,
    bottom: 2300,
    left: 0,
    right: 400,
    width: 400,
    height: 300,
    x: 0,
    y: 2000,
    toJSON: () => ({}),
  });
  return {
    scrollIntoView: () =>
      observers.forEach(({ callback, nodes }) =>
        callback(
          nodes.map((target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry),
          {} as IntersectionObserver,
        ),
      ),
  };
}

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('entrance gate', () => {
  it('holds a card below the fold, CSS animations included, until it scrolls into view', async () => {
    const page = offScreen();
    const { host, unmount } = await render(
      <RadialChartCard data={slices} category="browser" value="visits" />,
    );
    const card = host.querySelector('[data-lilt-chart]')!;
    expect(card.hasAttribute('data-lilt-unseen')).toBe(true);
    await act(async () => page.scrollIntoView());
    expect(card.hasAttribute('data-lilt-unseen')).toBe(false);
    unmount();
  });

  it('never holds a card on screen, or one whose motion is off', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 300,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    const onScreen = await render(
      <RadialChartCard data={slices} category="browser" value="visits" />,
    );
    expect(onScreen.host.querySelector('[data-lilt-unseen]')).toBeNull();
    onScreen.unmount();
    vi.restoreAllMocks();

    offScreen();
    const still = await render(
      <RadialChartCard motion="none" data={slices} category="browser" value="visits" />,
    );
    expect(still.host.querySelector('[data-lilt-unseen]')).toBeNull();
    still.unmount();
  });

  it('keeps a timeline at its first frame while unseen, then plays it', async () => {
    const frames: number[] = [];
    function Probe({ seen }: { seen: boolean }) {
      frames.push(useChartTimeline({ key: 'first', active: true, seen, duration: 40 }, false));
      return null;
    }
    const host = document.createElement('div');
    const root = createRoot(host);
    await act(async () => root.render(<Probe seen={false} />));
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)));
    expect(frames.every((frame) => frame === 0)).toBe(true);
    await act(async () => root.render(<Probe seen />));
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    expect(frames.at(-1)).toBe(1);
    act(() => root.unmount());
  });
});
