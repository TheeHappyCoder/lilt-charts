// Independent audit probes. Intentionally isolated from the normal suite.
// These assert the published contract, not the current implementation.
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RadarChart, RadialProgress, SankeyChart, ScatterChart } from '../dist/index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());

let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
});
async function render(node: ReactNode) {
  if (!root) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  }
  await act(async () => root!.render(node));
}
async function key(key: string) {
  const svg = host.querySelector('svg[tabindex="0"]');
  expect(svg).not.toBeNull();
  await act(async () => svg!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}

const cases = [
  {
    name: 'ScatterChart',
    render: (value: number, callback: ReturnType<typeof vi.fn>, selectedId?: string | null) => (
      <ScatterChart
        aria-label="Scatter probe"
        data={[{ id: 'one', x: 10, y: value }]}
        id={(row) => row.id}
        label={(row) => row.id}
        x={(row) => row.x}
        y={(row) => row.y}
        xLabel="X"
        yLabel="Y"
        onSelectionChange={callback}
        selectedId={selectedId}
      />
    ),
    value: (selection: any) => selection?.row.y,
    detail: '.lilt-scatter__detail',
  },
  {
    name: 'SankeyChart',
    render: (value: number, callback: ReturnType<typeof vi.fn>, selectedId?: string | null) => (
      <SankeyChart
        aria-label="Sankey probe"
        nodes={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
        links={[{ id: 'one', source: 'a', target: 'b', value }]}
        conservation="strict"
        unit="visits"
        onSelectionChange={callback}
        selectedId={selectedId}
      />
    ),
    value: (selection: any) => selection?.value,
    detail: '.lilt-sankey__detail',
  },
  {
    name: 'RadarChart',
    render: (value: number, callback: ReturnType<typeof vi.fn>, selectedId?: string | null) => (
      <RadarChart
        aria-label="Radar probe"
        unit="points"
        axes={['a', 'b', 'c'].map((id) => ({ id, label: id, min: 0, max: 100 }))}
        profiles={[{ id: 'one', label: 'One', values: { a: value, b: value, c: value } }]}
        onSelectionChange={callback}
        selectedId={selectedId}
      />
    ),
    value: (selection: any) => selection?.profile.values.a,
    detail: '.lilt-radar__detail',
  },
];

for (const family of cases) {
  describe(family.name, () => {
    it('baseline: keyboard can select and pin the first observation', async () => {
      const callback = vi.fn();
      await render(family.render(30, callback));
      await key('Home');
      await key('Enter');
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'one', pinned: true }),
      );
    });
    it('publishes transient keyboard inspection', async () => {
      const callback = vi.fn();
      await render(family.render(30, callback));
      await key('Home');
      expect(host.querySelector(family.detail)?.textContent).toContain('30');
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'one', pinned: false }),
      );
    });
    it('publishes an externally controlled selection', async () => {
      const callback = vi.fn();
      await render(family.render(30, callback, 'one'));
      expect(host.querySelector(family.detail)?.textContent).toContain('30');
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'one', pinned: true }),
      );
    });
    it('publishes refreshed accepted values for the same pinned ID', async () => {
      const callback = vi.fn();
      await render(family.render(30, callback));
      await key('Home');
      await key('Enter');
      expect(family.value(callback.mock.lastCall?.[0])).toBe(30);
      await render(family.render(45, callback));
      expect(host.querySelector(family.detail)?.textContent).toContain('45');
      expect(family.value(callback.mock.lastCall?.[0])).toBe(45);
    });
    it('does not publish a committed pin before the controlled owner accepts it', async () => {
      const callback = vi.fn();
      await render(family.render(30, callback, null));
      await key('Home');
      callback.mockClear();
      await key('Enter');
      expect(callback.mock.calls.some(([selection]) => selection?.pinned === true)).toBe(false);
    });
  });
}

describe('RadialProgress accepted refresh', () => {
  it('retains 72 while loading a null replacement in the same context', async () => {
    await render(<RadialProgress aria-label="Progress" value={72} maximum={100} motion="none" />);
    expect(host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('72');
    await render(
      <RadialProgress
        aria-label="Progress"
        value={null}
        maximum={100}
        status="loading"
        motion="none"
      />,
    );
    expect(host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('72');
  });
  it('does not accept an incoming 90 before it becomes ready', async () => {
    await render(<RadialProgress aria-label="Progress" value={72} maximum={100} motion="none" />);
    await render(
      <RadialProgress
        aria-label="Progress"
        value={90}
        maximum={100}
        status="loading"
        motion="none"
      />,
    );
    expect(host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('72');
  });
});
