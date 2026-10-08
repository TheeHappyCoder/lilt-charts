// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityRing, activitySlots } from './activity-ring';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class Observer {
  observe() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', Observer);
afterEach(() => vi.restoreAllMocks());

describe('hourly activity semantics', () => {
  it('keeps an absent bucket distinct from a measured zero and rejects duplicate hours', () => {
    const rows = [
      { hour: 0, value: 0 },
      { hour: 1, value: 6 },
    ];
    const slots = activitySlots(
      rows,
      (row) => row.hour,
      (row) => row.value,
      6,
    );
    expect(slots[0]).toMatchObject({ hour: 0, value: 0, row: rows[0] });
    expect(slots[2]).toMatchObject({ hour: 2, value: null, row: null });
    expect(() =>
      activitySlots(
        [rows[0], rows[0]],
        (row) => row.hour,
        (row) => row.value,
        6,
      ),
    ).toThrow('unique bucket-aligned times');
  });

  it('accepts 36 explicit 40-minute positions with wraparound and missing truth', () => {
    const rows = [
      { hour: 0, value: 0 },
      { hour: 23 + 1 / 3, value: 4 },
    ];
    const slots = activitySlots(
      rows,
      (row) => row.hour,
      (row) => row.value,
      4,
      40,
    );
    expect(slots).toHaveLength(36);
    expect(slots[0]).toMatchObject({ hour: 0, value: 0, row: rows[0] });
    expect(slots[35]).toMatchObject({ value: 4, row: rows[1] });
    expect(slots[1]).toMatchObject({ value: null, row: null });
    expect(() =>
      activitySlots(
        [{ hour: 0.5, value: 1 }],
        (row) => row.hour,
        (row) => row.value,
        4,
        40,
      ),
    ).toThrow('bucket-aligned');
  });

  it('lets keyboard users inspect and pin a real hour', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 320,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 320,
      toJSON: () => ({}),
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const selection = vi.fn();
    try {
      await act(async () =>
        root.render(
          <ActivityRing
            aria-label="Hourly requests"
            data={[
              { hour: 0, requests: 0 },
              { hour: 1, requests: 6 },
            ]}
            hour={(row) => row.hour}
            value={(row) => row.requests}
            maximum={6}
            unit="requests"
            motion="none"
            onSelectionChange={selection}
          />,
        ),
      );
      const svg = host.querySelector<SVGSVGElement>('.lilt-activity svg')!;
      await act(async () =>
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
      );
      await act(async () =>
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      );
      expect(selection.mock.lastCall?.[0]).toMatchObject({ hour: 1, value: 6, pinned: true });
      expect(host.querySelector('.lilt-activity__center')?.textContent).toContain('6');
      await act(async () =>
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
      );
      expect(selection.mock.lastCall?.[0]).toMatchObject({
        hour: 2,
        row: null,
        value: null,
        pinned: false,
      });
      await act(async () =>
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      );
      expect(selection.mock.lastCall?.[0]).toMatchObject({
        hour: 2,
        row: null,
        value: null,
        pinned: true,
      });
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
