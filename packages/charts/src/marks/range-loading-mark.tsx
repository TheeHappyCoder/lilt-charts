import { boxBlock, boxShape, rangeBarPath, rangeBarPrism, whiskerPath } from '../engine/ranges';
import { prismShades } from '../primitives/depth-paint';
import type { LoadingMark } from './contract';

const INK = 'color-mix(in srgb, var(--lilt-skeleton) 64%, var(--lilt-surface))';

/** Range placeholders draw through the same geometry as the measured marks. */
export function rangeLoadingMark(kind: 'range' | 'error' | 'boxplot', depth = false): LoadingMark {
  return {
    kind,
    depth: kind !== 'error' && depth,
    render: ({ cx, low, high, scales, mask }) => {
      const paint = mask ? 'white' : INK;
      const mid = (low + high) / 2;
      const line = (d: string) => <path d={d} fill="none" stroke={paint} strokeWidth={1.8} />;
      const prism = (faces: ReturnType<typeof rangeBarPrism>) => {
        const shades = prismShades(paint);
        return (
          <>
            <path d={faces.side} fill={mask ? paint : shades.side} />
            {faces.top ? <path d={faces.top} fill={mask ? paint : shades.top} /> : null}
            <path d={faces.front} fill={paint} />
          </>
        );
      };
      if (kind === 'range')
        return depth ? (
          prism(rangeBarPrism(cx, low, high, scales))
        ) : (
          <path d={rangeBarPath(cx, low, high, scales)} fill={paint} />
        );
      if (kind === 'error')
        return (
          <>
            {line(whiskerPath(cx, low, high, scales))}
            <circle cx={cx} cy={scales.y(mid)} r={3.25} fill={paint} />
          </>
        );
      const values = {
        min: low,
        q1: low + (high - low) * 0.23,
        median: mid,
        q3: high - (high - low) * 0.23,
        max: high,
      };
      if (depth) {
        const block = boxBlock(cx, values, scales);
        return (
          <>
            {line(block.lower)}
            {prism(block.faces)}
            {line(block.median + block.upper)}
          </>
        );
      }
      const shape = boxShape(cx, values, scales);
      return (
        <>
          <path d={shape.box} fill={paint} fillOpacity={mask ? 1 : 0.5} />
          {line(shape.median + shape.whiskers)}
        </>
      );
    },
  };
}
