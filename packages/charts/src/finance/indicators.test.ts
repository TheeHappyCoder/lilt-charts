import { describe, expect, it } from 'vitest';
import { bollinger, depthLevels, drawdown, ema, macd, rebase, rsi, sma } from './indicators';

describe('finance indicators', () => {
  it('averages full windows and leaves gaps and warm-up null', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(sma([1, null, 3, 4, 5, 6], 2)).toEqual([null, null, null, 3.5, 4.5, 5.5]);
    expect(() => sma([1], 0)).toThrow('positive integer');
  });

  it('seeds the exponential average with the simple average', () => {
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(ema([1, 2, null, 3], 2)).toEqual([null, 1.5, null, 2.5]);
  });

  it('smooths RSI the way Wilder did', () => {
    expect(rsi([1, 2, 3, 2, 3], 2)).toEqual([null, null, 100, 50, 75]);
    expect(rsi([5, 5, 5], 2)).toEqual([null, null, 50]);
    const falling = rsi([10, 9, 8, 7], 2);
    expect(falling.at(-1)).toBe(0);
  });

  it('derives MACD, its signal and histogram', () => {
    const result = macd([1, 2, 3, 4, 5, 6], 2, 3, 2);
    expect(result.macd).toEqual([null, null, 0.5, 0.5, 0.5, 0.5]);
    expect(result.signal).toEqual([null, null, null, 0.5, 0.5, 0.5]);
    expect(result.histogram).toEqual([null, null, null, 0, 0, 0]);
    expect(() => macd([1], 26, 12)).toThrow('shorter');
  });

  it('places Bollinger bands at population deviations', () => {
    const bands = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    expect(bands.middle.at(-1)).toBe(5);
    expect(bands.upper.at(-1)).toBe(9);
    expect(bands.lower.at(-1)).toBe(1);
    expect(bands.upper[0]).toBeNull();
  });

  it('measures drawdown below the highest value so far and rebases to the first value', () => {
    const fall = drawdown([100, 110, 99, 121, null]);
    expect(fall[2]).toBeCloseTo(-0.1, 12);
    expect([fall[0], fall[1], fall[3], fall[4]]).toEqual([0, 0, 0, null]);
    expect(rebase([null, 50, 75, 25])).toEqual([null, 0, 0.5, -0.5]);
  });

  it('accumulates depth from the best price outward', () => {
    const book = depthLevels(
      [
        { price: 99, size: 2 },
        { price: 100, size: 1 },
        { price: 99, size: 1 },
      ],
      [
        { price: 102, size: 4 },
        { price: 101, size: 3 },
      ],
    );
    expect(book.levels).toEqual([
      { price: 99, bid: 4, ask: null, size: 3, side: 'bid' },
      { price: 100, bid: 1, ask: null, size: 1, side: 'bid' },
      { price: 101, bid: null, ask: 3, size: 3, side: 'ask' },
      { price: 102, bid: null, ask: 7, size: 4, side: 'ask' },
    ]);
    expect(book).toMatchObject({
      bestBid: 100,
      bestAsk: 101,
      mid: 100.5,
      spread: 1,
      bidDepth: 4,
      askDepth: 7,
    });
    expect(() => depthLevels([{ price: 101, size: 1 }], [{ price: 100, size: 1 }])).toThrow(
      'crossed',
    );
  });
});
