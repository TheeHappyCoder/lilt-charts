import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import type { ChartComparisonContext } from '../types';

/** Placement only. Comparison content is explicitly supplied by the consumer. */
export function ComparisonTooltip({
  comparison,
  renderContent,
  startX,
  endX,
  top,
  width,
  height,
  className,
  ariaLabel,
}: {
  comparison: ChartComparisonContext;
  renderContent: (context: ChartComparisonContext) => ReactNode;
  startX: number;
  endX: number;
  top: number;
  width: number;
  height: number;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const measure = () => {
      const rect = panel.getBoundingClientRect();
      setBounds((current) =>
        current?.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  const panelWidth = bounds?.width ?? Math.min(280, width - 16);
  const leftEdge = Math.min(startX, endX);
  const rightEdge = Math.max(startX, endX);
  const left =
    rightEdge + 12 + panelWidth <= width - 8
      ? rightEdge + 12
      : leftEdge - 12 - panelWidth >= 8
        ? leftEdge - 12 - panelWidth
        : Math.max(8, width - panelWidth - 16);
  const y = Math.max(8, Math.min(top + 8, height - (bounds?.height ?? 0) - 8));
  return (
    <m.div
      ref={ref}
      role="region"
      aria-label={ariaLabel ?? 'Range comparison'}
      className={['lilt-chart__comparison-tooltip', className].filter(Boolean).join(' ')}
      data-preview={comparison.phase === 'preview' || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: comparison.motion === 'none' ? 0 : 0.15 }}
      style={{
        left,
        top: y,
        maxWidth: Math.max(1, width - 16),
        maxHeight: Math.max(1, height - 16),
        visibility: bounds ? 'visible' : 'hidden',
      }}
    >
      {renderContent(comparison)}
    </m.div>
  );
}
