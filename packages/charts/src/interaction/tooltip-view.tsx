import { createContext, useContext, type ReactNode } from 'react';
import type { ChartComparisonContext, ChartTooltipContext } from '../types';
import type { AdaptiveReadoutProps } from './adaptive-readout';

export interface TooltipView {
  inspection: ChartTooltipContext | null;
  comparison: ChartComparisonContext | null;
  colors: Readonly<Record<string, string>>;
  x: number;
  compareStartX: number;
  compareEndX: number;
  top: number;
  width: number;
  height: number;
  reducedMotion: boolean;
  compact: boolean;
  narrow: boolean;
  peer: boolean;
  /** Key hints while the observation slider has keyboard focus; a shown tooltip carries them. */
  keyboardHint: string | null;
  adaptive: Omit<AdaptiveReadoutProps<unknown>, 'renderContent'> | null;
  onRelease: () => void;
  onCompareFromHere?: () => void;
}

const TooltipViewContext = createContext<TooltipView | null>(null);

export function TooltipViewProvider({
  value,
  children,
}: {
  value: TooltipView;
  children: ReactNode;
}) {
  return <TooltipViewContext.Provider value={value}>{children}</TooltipViewContext.Provider>;
}

export function useTooltipView(): TooltipView {
  const value = useContext(TooltipViewContext);
  if (!value) throw new Error('Lilt Tooltip must be supplied through ChartPlot.tooltip.');
  return value;
}
