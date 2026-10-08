import type { ChartBarAppearance, ChartPalette, ChartSurface } from '@lilt-ui/charts';
import { barDoc } from './card-docs/bar';
import { dailySales } from './card-docs/data';
import { exampleSource, propSource, type CardExample } from './card-docs/examples';
import { variant } from './home-showcase';

/**
 * The home page's one chart: the level meter in the hero. It flies into the looks studio, is
 * restyled there, then carries the reader's look through the interactions and into the code. Every
 * place draws it from this module so each hand-off is exact.
 */
export const heroChart = variant(barDoc, '/charts/bar', 'segmented');

export interface HeroLook {
  palette: ChartPalette;
  barStyle: ChartBarAppearance;
  depth: boolean;
  surface: ChartSurface;
}

/** How the hero draws it, and so where the studio starts. */
export const HERO_LOOK: HeroLook = {
  palette: 'iris',
  barStyle: 'segmented',
  depth: false,
  surface: 'elevated',
};

/** The card's own defaults: printed code names only what differs from them. */
export const CARD_DEFAULTS: HeroLook = {
  palette: 'iris',
  barStyle: 'solid',
  depth: false,
  surface: 'elevated',
};

type Props = Readonly<Record<string, unknown>>;

const lookProps = (look: HeroLook) => ({
  palette: look.palette,
  depth: look.depth,
  barStyle: look.depth ? undefined : look.barStyle,
  surface: look.surface,
});

/** The hero chart in a given look, with any extra props such as loading or a scene's own. */
export function heroWithLook(look: HeroLook, extra: Props = {}): CardExample {
  const example = heroChart.example as CardExample;
  return { ...example, props: { ...example.props, ...lookProps(look), ...extra } };
}

/** The last week of the month, which the forecast scene treats as still to come. */
const FORECAST_FROM = new Date(Date.UTC(2026, 3, 14));
const SYNC_KEY = 'home-sales';

/**
 * Orders over the same thirty days as the sales, so the two cards can share a pointer. The final
 * week carries a projected range for the forecast scene.
 */
export const dailyOrders = dailySales.map((day, index) => {
  const orders = Math.round((day.newUsers + day.existing) / (84 + 6 * Math.sin(index * 0.9)));
  const ahead = day.date.getTime() >= FORECAST_FROM.getTime();
  const spread = ahead ? Math.round(orders * (0.05 + 0.012 * (index - 22))) : undefined;
  return {
    date: day.date,
    orders,
    low: spread === undefined ? undefined : orders - spread,
    high: spread === undefined ? undefined : orders + spread,
  };
});

export type SceneId = 'sync' | 'compare' | 'forecast';

/** What each interaction scene adds to the reader's chart, and to the card beside it. */
export const sceneProps: Record<SceneId, { main: Props; partner: Props }> = {
  sync: { main: { sync: SYNC_KEY }, partner: { sync: SYNC_KEY } },
  compare: { main: { compare: 'badge' }, partner: { compare: 'badge' } },
  forecast: {
    main: { target: { value: 15000, label: 'Daily goal' }, forecast: { from: FORECAST_FROM } },
    partner: { forecast: { from: FORECAST_FROM, lower: 'low', upper: 'high' } },
  },
};

/**
 * A scene's props for a copy of the chart outside the interactions stage: it keeps the scene's
 * look but links to nothing, so it never follows the demonstration pointer there.
 */
export function sceneAlone(scene: SceneId, own: string) {
  const props = sceneProps[scene].main;
  return props.sync ? { ...props, sync: own } : props;
}

/** The card that slides out from behind the reader's chart: orders, in the same palette. */
export function partnerWithLook(look: HeroLook, extra: Props = {}): CardExample {
  // Its rows are the home page's own, so they ride in the props rather than a named dataset.
  return {
    id: 'home-orders',
    title: 'Orders',
    description: 'Orders over the same thirty days as the sales.',
    kind: 'area',
    props: {
      title: 'Orders',
      data: dailyOrders,
      x: 'date',
      series: [{ key: 'orders', label: 'Orders' }],
      delta: 0.042,
      range: 'Last 30 days',
      palette: look.palette,
      surface: look.surface,
      ...extra,
    },
  } as unknown as CardExample;
}

/** The home preview and its copyable source use the same data and props. */
export function heroSource(look: HeroLook, scene?: SceneId) {
  const extra = scene ? sceneProps[scene].main : {};
  const example = heroWithLook(look, extra);
  const chosen = [
    ...(look.depth ? ['depth'] : look.barStyle !== CARD_DEFAULTS.barStyle ? ['barStyle'] : []),
    ...(look.palette !== CARD_DEFAULTS.palette ? ['palette'] : []),
    ...(look.surface !== CARD_DEFAULTS.surface ? ['surface'] : []),
    ...Object.keys(extra),
  ].map((key) => propSource(key, example.props[key], '  '));
  return { code: exampleSource(example, 'Sales'), chosen };
}

/** The same chart, asked of an agent. */
export function heroPrompt(look: HeroLook, scene?: SceneId) {
  const { chosen } = heroSource(look, scene);
  const extras = chosen.length ? ` with ${chosen.join(', ')}` : '';
  return `Add a daily sales chart with Lilt Charts.

Use BarChartCard from '@lilt-ui/charts' and import
'@lilt-ui/charts/styles.css' once. Stack two series,
newUsers and existing, by date${extras}.
Keys are checked against the row type, so use my real
field names.`;
}
