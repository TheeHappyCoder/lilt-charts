'use client';

import { useEffect, useState } from 'react';
import { AsciiSplitFlap, type AsciiSplitFlapProps } from './ascii-split-flap';

const BOARD = ['LILT UI\nON TIME', 'CHARTS\nBOARDING', 'ASCII\nGATE 7', 'NEW\nDEPARTED'];

/** A board that changes every few seconds, for watching the flaps turn. */
export function AsciiSplitFlapDemo({
  interval = 4,
  ...props
}: AsciiSplitFlapProps & { interval?: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => i + 1), Math.max(1.5, interval) * 1000);
    return () => window.clearInterval(timer);
  }, [interval]);
  const text =
    props.text && props.text !== 'DEPARTURES' ? props.text : BOARD[index % BOARD.length]!;
  return <AsciiSplitFlap {...props} text={text} length={props.length ?? 8} />;
}
