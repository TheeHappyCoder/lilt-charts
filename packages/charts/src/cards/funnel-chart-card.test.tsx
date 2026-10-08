// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { FunnelChartCard, stagePath, stageShare } from './funnel-chart-card';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stages = [
  { stage: 'Opened', people: 200 as number | null },
  { stage: 'Started', people: 110 },
  { stage: 'Invited', people: null },
  { stage: 'Converted', people: 1 },
];

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

const text = (host: HTMLElement, selector: string) =>
  [...host.querySelectorAll(selector)].map((node) => node.textContent);

describe('FunnelChartCard', { timeout: 15_000 }, () => {
  it('sizes bands by share of the first stage and skips a missing stage', async () => {
    const { host, unmount } = await render(
      <FunnelChartCard
        motion="none"
        title="Sign-ups"
        data={stages}
        category="stage"
        value="people"
      />,
    );
    try {
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('200');
      expect(host.querySelectorAll('.lilt-funnel-card__band')).toHaveLength(3);
      expect(host.querySelector('[data-stage="Invited"]')).toBeNull();
      expect(text(host, '.lilt-funnel-card__pill')).toEqual(['100%', '55%', '—', '<1%']);
      expect(text(host, '.lilt-chart__legend-value')).toEqual(['200', '110', 'No data', '1']);
      expect(host.querySelectorAll('.lilt-funnel-card__divider')).toHaveLength(3);
    } finally {
      unmount();
    }
  });

  it('reads a hovered stage with the conversion from the step before', async () => {
    const { host, unmount } = await render(
      <FunnelChartCard
        motion="none"
        title="Sign-ups"
        data={stages}
        category="stage"
        value="people"
      />,
    );
    try {
      const started = host.querySelectorAll('.lilt-funnel-card__column')[1]!;
      await act(async () => {
        started.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(host.querySelector('.lilt-card__value')?.textContent).toContain('110');
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe(
        'Started · 55% of Opened',
      );
      expect(host.querySelectorAll('.lilt-funnel-card__band[data-muted]')).toHaveLength(2);
      // After a missing stage there is no step to convert from, so the caption only names it.
      const converted = host.querySelectorAll('.lilt-funnel-card__column')[3]!;
      await act(async () => {
        started.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
        converted.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      });
      expect(host.querySelector('.lilt-card__caption')?.textContent).toBe('Converted');
    } finally {
      unmount();
    }
  });

  it('refuses a stage that grows, since a funnel can only narrow', async () => {
    const { host, unmount } = await render(
      <FunnelChartCard
        motion="none"
        title="T"
        data={[
          { stage: 'a', people: 10 },
          { stage: 'b', people: 12 },
        ]}
        category="stage"
        value="people"
      />,
    );
    try {
      expect(host.querySelector('.lilt-chart__status')?.textContent).toContain('can only');
      expect(host.querySelector('.lilt-funnel-card__band')).toBeNull();
    } finally {
      unmount();
    }
  });

  it('draws one color, lanes, and straight tapers when asked', async () => {
    const { host, unmount } = await render(
      <FunnelChartCard
        motion="none"
        title="T"
        data={stages}
        category="stage"
        value="people"
        colors="single"
        tracks
        curve="linear"
      />,
    );
    try {
      const fills = [...host.querySelectorAll<SVGPathElement>('.lilt-funnel-card__band')].map(
        (band) => band.style.fill,
      );
      expect(new Set(fills)).toEqual(new Set(['var(--lilt-series-1)']));
      expect(host.querySelectorAll('.lilt-funnel-card__track')).toHaveLength(4);
      expect(host.querySelector('.lilt-funnel-card__band')?.getAttribute('d')).not.toContain('C');
    } finally {
      unmount();
    }
  });

  it('shapes stages and shares honestly', () => {
    expect(stageShare(null)).toBe('—');
    expect(stageShare(0)).toBe('0%');
    expect(stageShare(0.004)).toBe('<1%');
    expect(stageShare(0.556)).toBe('56%');
    // A level stage holds its own height across the column.
    expect(stagePath(1, 40, null, 'linear')).toBe('M100,30 L200,30 L200,70 L100,70 Z');
    // A smooth stage reaches the next stage's height exactly at the column edge.
    const smooth = stagePath(0, 100, 50, 'smooth');
    expect(smooth.startsWith('M0,0 L55,0 C')).toBe(true);
    expect(smooth).toContain(' 100,25 L100,75 ');
  });
});

describe('FunnelChartCard with a selection you own', { timeout: 15_000 }, () => {
  it('pins the owner’s stage and asks before changing it', async () => {
    const requests: (string | null)[] = [];
    const { host, unmount } = await render(
      <FunnelChartCard
        motion="none"
        title="Sign-ups"
        data={stages}
        category="stage"
        value="people"
        selected="Started"
        onSelectedChange={(next) => requests.push(next)}
      />,
    );
    try {
      const lit = () =>
        [...host.querySelectorAll('.lilt-funnel-card__column:not([data-muted])')].map((node) =>
          node.getAttribute('data-glide-id'),
        );
      expect(lit()).toEqual(['Started']);
      const opened = host.querySelector<HTMLButtonElement>('[data-glide-id="Opened"]')!;
      await act(async () => opened.click());
      expect(requests).toEqual(['Opened']);
      expect(lit()).toEqual(['Started']);
    } finally {
      unmount();
    }
  });
});
