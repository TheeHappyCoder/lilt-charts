'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SegmentedOption } from '@/components/ui/segmented';
import type { ChartDocSettings } from '@/lib/card-docs/resolve-example';

interface ChartSettingsContextValue {
  settings: ChartDocSettings;
  setSetting: <Key extends keyof ChartDocSettings>(key: Key, value: ChartDocSettings[Key]) => void;
  reset: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ChartSettingsContext = createContext<ChartSettingsContextValue | null>(null);
const STORAGE_KEY = 'lilt-chart-settings';

/**
 * Lives in the browser layout, so settings follow the reader across every page and reload.
 * Storage is a convenience: without it, settings still apply for the visit.
 */
export function ChartSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ChartDocSettings>({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved && typeof saved === 'object') setSettings(saved as ChartDocSettings);
    } catch {
      // Unreadable storage starts the visit with every chart as it ships.
    }
  }, []);
  const save = (next: ChartDocSettings) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The setting still applies; it just won't be remembered.
    }
    return next;
  };
  const setSetting: ChartSettingsContextValue['setSetting'] = useCallback((key, value) => {
    setSettings((previous) => {
      const next = { ...previous, [key]: value };
      if (value === undefined) delete next[key];
      return save(next);
    });
  }, []);
  const reset = useCallback(() => setSettings(save({})), []);
  const value = useMemo(
    () => ({ settings, setSetting, reset, open, setOpen }),
    [settings, setSetting, reset, open],
  );
  return <ChartSettingsContext.Provider value={value}>{children}</ChartSettingsContext.Provider>;
}

export function useChartSettings() {
  const context = useContext(ChartSettingsContext);
  if (!context) throw new Error('Chart settings require ChartSettingsProvider.');
  return context;
}

export const AUTO = 'auto';
const swatch = (color: string, label: string) => (
  <span className="lilt-island__swatch-option">
    <span className="lilt-island__swatch" style={{ background: color }} aria-hidden="true" />
    {label}
  </span>
);

export interface Control<Key extends keyof ChartDocSettings> {
  key: Key;
  label: string;
  /** The Customize page that explains this prop. */
  href: string;
  options: readonly SegmentedOption<string>[];
  /** Turns a picked option back into the setting's value. */
  parse?: (value: string) => ChartDocSettings[Key];
  format?: (value: ChartDocSettings[Key]) => string;
}

/** Every control applies to every chart that takes the prop, on every chart page. */
export const controls: readonly Control<keyof ChartDocSettings>[] = [
  {
    key: 'palette',
    label: 'Palette',
    href: '/customize/colors',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'iris', label: swatch('#7c5cff', 'Iris') },
      { value: 'cobalt', label: swatch('#2f6fed', 'Cobalt') },
      { value: 'emerald', label: swatch('#0e9a77', 'Emerald') },
    ],
  },
  {
    key: 'depth',
    label: 'Depth',
    href: '/customize/3d',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'flat', label: 'Flat' },
      { value: '3d', label: '3D' },
    ],
    parse: (value) => value === '3d',
    format: (value) => (value === undefined ? AUTO : value ? '3d' : 'flat'),
  },
  {
    key: 'surface',
    label: 'Surface',
    href: '/customize/surfaces',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'elevated', label: 'Elevated' },
      { value: 'outline', label: 'Outline' },
      { value: 'ghost', label: 'Ghost' },
    ],
  },
  {
    key: 'background',
    label: 'Background',
    href: '/customize/backgrounds',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'dots', label: 'Dots' },
      { value: 'grid', label: 'Grid' },
      { value: 'lines', label: 'Lines' },
      { value: 'none', label: 'None' },
    ],
  },
  {
    key: 'axis',
    label: 'Axis',
    href: '/customize/axes',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'inline', label: 'Inline' },
      { value: 'classic', label: 'Classic' },
      { value: 'ruler', label: 'Ruler' },
      { value: 'segmented', label: 'Segmented' },
      { value: 'dots', label: 'Dots' },
    ],
  },
  {
    key: 'hover',
    label: 'Hover',
    href: '/customize/hover',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'pills', label: 'Pills' },
      { value: 'tooltip', label: 'Tooltip' },
      { value: 'strip', label: 'Strip' },
      { value: 'headline', label: 'Headline' },
    ],
  },
  {
    key: 'legend',
    label: 'Legend',
    href: '/customize/legends',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'tiles', label: 'Tiles' },
      { value: 'inline', label: 'Inline' },
      { value: 'list', label: 'List' },
      { value: 'pills', label: 'Pills' },
      { value: 'bars', label: 'Bars' },
    ],
  },
  {
    key: 'numberStyle',
    label: 'Numbers',
    href: '/customize/numbers',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'count', label: 'Count' },
      { value: 'roll', label: 'Roll' },
      { value: 'slide', label: 'Slide' },
      { value: 'flow', label: 'Flow' },
      { value: 'pop', label: 'Pop' },
      { value: 'scramble', label: 'Scramble' },
    ],
  },
  {
    key: 'loadingStyle',
    label: 'Loading',
    href: '/customize/loading',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'shimmer', label: 'Shimmer' },
      { value: 'draw', label: 'Draw' },
      { value: 'breathe', label: 'Breathe' },
    ],
  },
  {
    key: 'empty',
    label: 'Empty',
    href: '/customize/empty',
    options: [
      { value: AUTO, label: 'Auto' },
      { value: 'dots', label: 'Dots' },
      { value: 'shape', label: 'Shape' },
    ],
  },
];
