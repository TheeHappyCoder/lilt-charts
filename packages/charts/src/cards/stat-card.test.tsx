// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { StatCard, meterCells } from './stat-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const weeks = [
  { week: 'W1', signups: 100 as number | null, trials: 40 },
  { week: 'W2', signups: 120, trials: 44 },
  { week: 'W3', signups: null, trials: 51 },
  { week: 'W4', signups: 150, trials: 48 },
  { week: 'W5', signups: 170, trials: 60 },
];

async function render(element: React.ReactElement) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 300,
    height: 56,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 300,
    bottom: 56,
    toJSON: () => ({}),
  } as DOMRect);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));
  return {
    host,
    rerender: (next: React.ReactElement) => act(async () => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
      vi.restoreAllMocks();
    },
  };
}

/** Poll instead of waiting a fixed time: pointer handling runs on animation frames. */
async function until(check: () => boolean, timeout = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for the card.');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

describe('StatCard', { timeout: 15_000 }, () => {
  it('sums observed values, leaving a gap out of the total and the line', async () => {
    const { host, unmount } = await render(
      <StatCard
        motion="none"
        title="Signups"
        data={weeks}
        value="signups"
        x="week"
        chart="line"
        delta={0.067}
        caption="vs last quarter"
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('540');
      expect(host.querySelector('.lilt-card__delta')?.textContent).toBe('+6.7%');
      expect(host.querySelector('.lilt-stat__caption')?.textContent).toBe('vs last quarter');
      // W3 is missing, so the line breaks into two runs rather than dipping to zero.
      expect(host.querySelectorAll('.lilt-chart__line path[data-lilt-path]')).toHaveLength(2);
      expect(host.querySelector('.lilt-chart__area')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('shows the latest level with aggregate="last" and draws an area by default', async () => {
    const { host, unmount } = await render(
      <StatCard motion="none" title="Signups" data={weeks} value="signups" aggregate="last" />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('170');
      expect(host.querySelector('.lilt-chart__area')).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('switches to another field without failing', async () => {
    const card = (value: 'signups' | 'trials') => (
      <StatCard motion="none" title="Weekly" data={weeks} value={value} chart="line" />
    );
    const { host, rerender, unmount } = await render(card('signups'));
    try {
      await rerender(card('trials'));
      await until(() => host.querySelector('.lilt-chart__line--trials') !== null);
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('243');
    } finally {
      unmount();
    }
  });

  it('swaps the value and caption for the hovered point', async () => {
    const { host, unmount } = await render(
      <StatCard
        motion="none"
        title="Signups"
        data={weeks}
        value="signups"
        x="week"
        caption="vs last quarter"
      />,
    );
    try {
      const plot = host.querySelector('.lilt-chart__svg')!;
      await until(() => {
        plot.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX: 299,
            clientY: 20,
            pointerType: 'mouse',
          }),
        );
        return host.querySelector('.lilt-stat__caption')?.textContent === 'W5';
      });
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('170');
      expect(host.querySelector('.lilt-card__delta')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('draws one bar per observation and none for a gap', async () => {
    const { host, unmount } = await render(
      <StatCard motion="none" title="Signups" data={weeks} value="signups" chart="bars" />,
    );
    try {
      expect(
        host.querySelectorAll('.lilt-chart__bars[data-series="signups"] .lilt-chart__bar-mark'),
      ).toHaveLength(4);
    } finally {
      unmount();
    }
  });

  it('fills a meter toward the target, trimming the last cell to the exact value', async () => {
    const { host, unmount } = await render(
      <StatCard
        motion="none"
        title="Goal"
        data={weeks}
        value="signups"
        chart="meter"
        target={1000}
      />,
    );
    try {
      const meter = host.querySelector('[role="meter"]')!;
      expect(meter.getAttribute('aria-valuenow')).toBe('540');
      expect(meter.getAttribute('aria-valuemax')).toBe('1000');
      expect(host.querySelector('.lilt-stat__meter-labels')?.textContent).toContain(
        '54% of target',
      );
      expect(host.querySelector('.lilt-chart__svg')).toBeNull();
    } finally {
      unmount();
    }
    const cells = meterCells(0.54, 28);
    expect(cells.filter((fill) => fill === 1)).toHaveLength(15);
    expect(cells[15]).toBeCloseTo(0.12, 5);
    expect(cells.reduce((sum, fill) => sum + fill, 0)).toBeCloseTo(0.54 * 28, 5);
    expect(meterCells(1.4, 4)).toEqual([1, 1, 1, 1]);
  });

  it('renders a headline without data, and a dash when nothing was observed', async () => {
    const plain = await render(
      <StatCard motion="none" title="Seats" headline={128} chart="none" />,
    );
    try {
      expect(plain.host.querySelector('.lilt-card__value')?.textContent).toContain('128');
      expect(plain.host.querySelector('.lilt-chart__svg')).toBeNull();
    } finally {
      plain.unmount();
    }
    const empty = await render(
      <StatCard
        motion="none"
        title="Signups"
        data={[{ week: 'W1', signups: null }]}
        value="signups"
      />,
    );
    try {
      expect(empty.host.querySelector('.lilt-card__value')?.textContent).toBe('—');
    } finally {
      empty.unmount();
    }
  });
});
