# Public chart contracts

Import components from `@lilt-ui/charts` and `@lilt-ui/charts/styles.css` once, in a client component. `@lilt-ui/charts/data` exports `summarizeRange`, `toChartCsv` and `summarizeFunnelStages` for server or client use without loading the chart runtime. Finance cards come from `@lilt-ui/charts/finance`.

## Cards

Most charts start as a card: `AreaChartCard`, `LineChartCard`, `BarChartCard`, `ComboChartCard`, `StatCard`, `HorizontalBarChartCard`, `RadialChartCard`, `ProgressCard`, `ActivityRingCard`, `FunnelChartCard`, `HeatmapChartCard`, `ScatterChartCard`, `SankeyChartCard`, `RadarChartCard`, `SlopeChartCard`, `RangeChartCard` and `BoxPlotCard`. A card takes your rows and the names of their fields, which TypeScript checks against the row type. Each chart page lists its card's full props.

`RadialChartCard`, `FunnelChartCard` and `HorizontalBarChartCard` accept `selected` and `onSelectedChange` to share their pinned category with your own controls. `RadialChartCard` also takes fixed `colors` by category name and a `center` render function.

The [complete card index](/llms.txt) includes the 23 Cool families, from Skyline and Terrain to Sunburst terraces and Voxel cloud. Each has its own data contract and chart page. Existing family pages also cover `StreamgraphCard`, `DivergingBarCard`, `MirroredBarCard`, `NestedDonutCard`, `ComparativeFunnelCard`, `GoalPacingCard`, `MilestoneProgressCard`, `ViolinCard`, and `CorrelationMatrixCard`.

## Observation cards

`TreemapChartCard` takes `label`, nonnegative `value`, and optional `group` for one parent level. `CalendarHeatmapCard` takes `date` and `value`, and optional UTC `from`, `to`, `today`, `weekStartsOn` and color `domain`. `TimelineChartCard` takes `label`, `start`, `end`, optional unique `id`, `lane`, and color `group`; overlapping intervals occupy separate subrows. Its numeric readings are durations in milliseconds, formatted as hours by default. `StripChartCard` takes `category`, `value`, optional unique `label`, and `display="strip" | "beeswarm"`.

These cards share `depth`, palette/surface controls, `loading`, all three `loadingStyle` options, the existing skeleton opacity exit, and reduced motion. Accepted readings survive refreshes. `onSelectionChange` reports the original row, value, id and pin state; an absent calendar day has a null row. `renderReadout` lets consumers supply their own JSX even with `header={false}`. Buttons support keyboard inspection and pin/release, and an accessible table retains missing observations and zero-area leaves. Treemap gets its own documentation page; Calendar, Timeline and Strip/beeswarm stay with Heatmap, Range and Scatter.

## Composition

`Chart` owns ordered time/numeric and category plots. Compose `ChartPlot` with `Area`, `Line`, `Bar`, `XAxis`, `YAxis`, `Grid`, `Legend`, and an optional `Tooltip`. A category x keeps identity (`accessor`, unique) apart from its label (`format`, may repeat); duplicate identities stop the chart with a specific error. `ChartPlot` takes two independent choices: `bars` (which series draw as bars) and `stack` (which series add up, as a signed `sum` or a `percent` share). Together they cover grouped and stacked bars, stacked areas, category bars, and combo Bar/Line plots, including lines drawn unstacked over a stack.

## Card composition

Card titles are optional. Omitting `title` omits its visible element; `aria-label` independently names the chart. `header={false}` removes the header, including headline, delta and period controls. In a depth card this includes the summary stats; in an order book it removes the caption, keeping column headings. The stat ring remains visible when its header is hidden.

Cards with legend layout options accept `legend={false}`, preserving the underlying data and marks. `surface="ghost"` only removes the visual frame. Supply the selected rows through `data` when the app owns period selection.

With `ranges`, cards draw Lilt's period select, a listbox pill with arrow, Home/End, Enter, Escape and type-ahead keys that returns focus to the pill on close. `ChartComponentsProvider rangeSelect={Component}` replaces it in every card below; the component receives `ChartRangeSelectProps`: `value`, `options` (`id`, `label`), `onValueChange(id)` and `aria-label`.

Radial cards keep custom `center` content and controlled `selected` with header and legend hidden. The graphic becomes a keyboard inspection target: arrows, Home/End, Enter/Space to pin, Escape to release. Escape requests `onSelectedChange(null)` in every layout and does not override a controlled pin until the owner accepts it.

## Inspection and comparison

Default legends use rounded color squares and may display inspected values. `Legend` accepts custom item rendering and a compact inline variant. Tooltip rendering is opt-in: mount `Tooltip` through `ChartPlot`'s `tooltip` slot. Plot hover markers remain visible with no tooltip. Below 420px the tooltip shows values in a readout under the plot by default; `adaptive={false}` keeps a floating panel that turns compact (`density`) to fit small fixed-height plots.

`Chart compare` supplies endpoint selection and calculations. `useChartComparison()` and `compare.onChange` expose the complete typed result, including unavailable reasons, signed changes, and optional percentage changes. Consumers render comparison JSX wherever needed; enabling compare does not insert a results panel.

`createChartController` can link compatible ordered charts, retain inspection across mounts, and control focus. `ChartBrush`, `ChartToolbar`, `ChartReadout`, and `ChartOverview` are optional composition pieces. No D3, Visx, SVG path, or Motion value appears in public props.
