// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import * as motion from 'motion/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AnimatedNumber,
  interpolationFrameValue,
  numberCells,
  reelTarget,
  type AnimatedNumberVariant,
} from './animated-number';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    render: (element: React.ReactElement) => act(async () => root.render(element)),
    unmount: async () => {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

describe('number cells', () => {
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const keys = (value: number, withParts: boolean) =>
    numberCells(usd.format(value), withParts ? usd.formatToParts(value) : undefined).map((cell) => [
      cell.key,
      cell.char,
      cell.role,
    ]);

  it('keeps a currency sign on one key while digits are added, with or without Intl parts', () => {
    for (const withParts of [true, false]) {
      const before = keys(999, withParts);
      const after = keys(1000, withParts);
      expect(before[0]).toEqual(after[0]);
      expect(after[0]?.[2]).toBe('prefix');
      // The ones digit keeps its key too.
      expect(before.at(-1)?.[0]).toBe(after.at(-1)?.[0]);
    }
  });

  it('keys digits by place value from the decimal point', () => {
    const format = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 });
    const cells = numberCells(format.format(1234.5), format.formatToParts(1234.5));
    expect(cells.map((cell) => cell.key)).toEqual(['i3', 'g3', 'i2', 'i1', 'i0', 'dec', 'f0']);
  });

  it('holds symbols after the number as a suffix', () => {
    const cells = numberCells('12%');
    expect(cells.map((cell) => cell.role)).toEqual(['number', 'number', 'suffix']);
  });
});

describe('digit reel', () => {
  it('turns forward through 9 → 0 when rising and backward when falling', () => {
    expect(reelTarget(18, 2, 1)).toBe(22);
    expect(reelTarget(18, 2, -1)).toBe(12);
    expect(reelTarget(13, 3, 1)).toBe(13);
    expect(reelTarget(10, 9, -1)).toBe(9);
  });
});

describe('AnimatedNumber', () => {
  it.each(['count', 'slide', 'roll', 'pop', 'scramble', 'flow'] as const)(
    'hydrates %s without a mismatch when the client prefers reduced motion',
    async (variant) => {
      const preference = vi.spyOn(motion, 'useReducedMotion').mockReturnValue(false);
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const host = document.createElement('div');
      document.body.append(host);
      let root: ReturnType<typeof hydrateRoot> | undefined;
      const element = (
        <AnimatedNumber
          value={1234}
          format={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })}
          variant={variant}
        />
      );
      try {
        host.innerHTML = renderToString(element);
        preference.mockReturnValue(true);
        await act(async () => {
          root = hydrateRoot(host, element);
        });
        expect(host.querySelector('.lilt-chart__sr-only')?.textContent).toBe('$1,234.00');
        expect(errors.mock.calls).toEqual([]);
      } finally {
        if (root) await act(async () => root!.unmount());
        host.remove();
        preference.mockRestore();
        errors.mockRestore();
      }
    },
  );

  it('renders one cell per character in every variant and tells screen readers the value once', async () => {
    const { host, render, unmount } = await mount();
    try {
      for (const variant of ['slide', 'roll', 'scramble', 'count'] as const) {
        await render(<AnimatedNumber value={1234} format={(n) => `$${n}`} variant={variant} />);
        expect(host.querySelector('.lilt-number')?.getAttribute('data-variant')).toBe(variant);
        expect(host.querySelector('.lilt-chart__sr-only')?.textContent).toBe('$1234');
        expect(host.querySelectorAll('.lilt-number__place')).toHaveLength(5);
      }
    } finally {
      await unmount();
    }
  });

  it('builds a 0–9 reel for each digit in the roll variant', async () => {
    const { host, render, unmount } = await mount();
    try {
      await render(<AnimatedNumber value={42} variant="roll" />);
      expect(host.querySelectorAll('.lilt-number__reel')).toHaveLength(2);
      expect(host.querySelector('.lilt-number__reel')?.children).toHaveLength(30);
    } finally {
      await unmount();
    }
  });

  it('hands an Intl format to NumberFlow, and slides a plain function instead', async () => {
    const { host, render, unmount } = await mount();
    const usd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    try {
      await render(<AnimatedNumber value={1234} format={usd} variant="flow" />);
      expect(host.querySelector('number-flow-react')).not.toBeNull();
      expect(host.querySelector('.lilt-chart__sr-only')?.textContent).toBe('$1,234');
      await render(<AnimatedNumber value={1234} format={(n) => `$${n}`} variant="flow" />);
      expect(host.querySelector('number-flow-react')).toBeNull();
      expect(host.querySelectorAll('.lilt-number__place')).toHaveLength(5);
    } finally {
      await unmount();
    }
  });

  it('pops the whole value in as one piece', async () => {
    const { host, render, unmount } = await mount();
    try {
      await render(<AnimatedNumber value={1234} format={(n) => `$${n}`} variant="pop" />);
      expect(host.querySelectorAll('.lilt-number__pop')).toHaveLength(1);
      // The currency sign sits outside the popping digits, so it never moves.
      expect(host.querySelectorAll('.lilt-number__pop-char')).toHaveLength(4);
      expect(host.querySelector('.lilt-number__pop')?.textContent).toBe('1234');
      expect(host.querySelector('.lilt-number__characters')?.textContent).toBe('$1234');
    } finally {
      await unmount();
    }
  });

  it('keeps animating while values arrive quickly, legible from the first frame', async () => {
    // Each render reads the clock once per change; 30ms steps make every change a live reading
    // however slowly the test machine renders.
    let clock = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 30));
    const { host, render, unmount } = await mount();
    const usd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    try {
      for (const variant of ['pop', 'slide'] as const) {
        await render(<AnimatedNumber value={100} format={usd} variant={variant} />);
        await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
        for (const value of [245, 1380, 972]) {
          await render(<AnimatedNumber value={value} format={usd} variant={variant} />);
        }
        await render(<AnimatedNumber value={1515} format={usd} variant={variant} />);
        // The newest value is never blank: it starts part-visible and only gets clearer.
        const entering =
          variant === 'pop'
            ? [...host.querySelectorAll('.lilt-number__pop')].find(
                (node) => node.textContent === '1,515',
              )?.firstElementChild
            : host.querySelector(
                '.lilt-number__place:last-child .lilt-number__glyph[data-present]',
              );
        // AnimatePresence can insert a returning glyph before outgoing glyphs. DOM order does
        // not identify the current digit; the previous reading's "2" is allowed to fade out.
        expect(entering?.textContent).toBe(variant === 'pop' ? '1' : '5');
        const style = (entering as HTMLElement | null)?.style;
        expect(
          Number(style?.opacity),
          `${variant}: ${entering?.textContent}`,
        ).toBeGreaterThanOrEqual(0.35);
        // Old values clear quickly, leaving one clean reading and one currency sign.
        await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
        const characters = host.querySelector('.lilt-number__characters')!;
        expect(characters.textContent).toBe('$1,515');
      }
    } finally {
      await unmount();
      now.mockRestore();
    }
  }, 15_000);

  it('clears a settled change once it has animated, leaving one value and one currency sign', async () => {
    const { host, render, unmount } = await mount();
    const usd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    try {
      for (const variant of ['pop', 'slide'] as const) {
        await render(<AnimatedNumber value={4210} format={usd} variant={variant} />);
        await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
        await render(<AnimatedNumber value={124130} format={usd} variant={variant} />);
        await act(async () => new Promise((resolve) => setTimeout(resolve, 900)));
        const characters = host.querySelector('.lilt-number__characters')!;
        expect(characters.textContent).toBe('$124,130');
        expect(characters.textContent?.match(/\$/g)).toHaveLength(1);
      }
    } finally {
      await unmount();
    }
  });

  it('keeps interim counts at the precision of the accepted value', () => {
    const number = new Intl.NumberFormat('en-US');
    expect(number.format(interpolationFrameValue(123.456, 500))).toBe('123');
    expect(number.format(interpolationFrameValue(123.456, 500.5))).toBe('123.5');
    expect(interpolationFrameValue(-0.04, 12)).toBe(0);
    expect(interpolationFrameValue(0.00000036, 0.0000005)).toBe(0.0000004);
  });

  it('settles on the new value at once when motion is off', async () => {
    const { host, render, unmount } = await mount();
    const variants: AnimatedNumberVariant[] = ['slide', 'roll', 'flow', 'pop', 'scramble', 'count'];
    try {
      for (const variant of variants) {
        const element = (value: number) => (
          <AnimatedNumber
            value={value}
            format={(n) => `$${n.toFixed(0)}`}
            variant={variant}
            motion="none"
          />
        );
        await render(element(120));
        await render(element(860));
        expect(host.querySelector('.lilt-chart__sr-only')?.textContent).toBe('$860');
        expect(host.querySelector('.lilt-number__characters')?.textContent).toBe('$860');
        expect(host.querySelector('.lilt-number__reel')).toBeNull();
      }
    } finally {
      await unmount();
    }
  });
});
