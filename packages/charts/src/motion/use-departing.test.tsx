// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useDeparting } from './use-departing';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDeparting', () => {
  it('keeps a removed item from the very first render after it leaves, then lets it go', async () => {
    vi.useFakeTimers();
    const seen: string[][] = [];
    function List({ items }: { items: { id: string; at: number }[] }) {
      // Rebuilt every render, like a chart's positioned marks.
      const marks = items.map((item) => ({ ...item }));
      const departing = useDeparting(marks, (mark) => mark.id, 400);
      seen.push(departing.map((mark) => `${mark.id}@${mark.at}`));
      return null;
    }
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <List
            items={[
              { id: 'a', at: 1 },
              { id: 'b', at: 2 },
            ]}
          />,
        ),
      );
      expect(seen.at(-1)).toEqual([]);
      await act(async () => root.render(<List items={[{ id: 'a', at: 5 }]} />));
      // b departs from where it was last drawn, in the same commit that removed it.
      expect(seen.at(-1)).toEqual(['b@2']);
      await act(async () => vi.advanceTimersByTime(450));
      expect(seen.at(-1)).toEqual([]);

      // An item that comes straight back stops departing.
      await act(async () => root.render(<List items={[]} />));
      expect(seen.at(-1)).toEqual(['a@5']);
      await act(async () => root.render(<List items={[{ id: 'a', at: 6 }]} />));
      expect(seen.at(-1)).toEqual([]);
    } finally {
      act(() => root.unmount());
      vi.useRealTimers();
    }
  });
});
