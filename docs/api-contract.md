# Public chart contracts

Import interactive components from `@lilt-ui/charts` and `@lilt-ui/charts/styles.css` in a client component. `@lilt-ui/charts/data` exports `summarizeRange` and `toChartCsv` for server or client use without loading the chart runtime.

## Composition

`Chart` owns ordered time/numeric and category plots. Compose `ChartPlot` with `Area`, `Line`, `Bar`, `XAxis`, `YAxis`, `Grid`, `Legend`, and an optional `Tooltip`. `Sparkline` reuses this runtime. Category families use stable IDs; range focus applies only to ordered time/numeric coordinates.

Standalone `HorizontalBarChart`, `RadialChart`, `RadialProgress`, `ActivityRing`, `FunnelChart`, `HeatmapChart`, `ScatterChart`, `SankeyChart`, and `RadarChart` expose family-specific geometry and selection. They support keyboard inspection, explicit missing values, loading states, and reduced motion. `Chart` also supports grouped and stacked bars, absolute/percent/diverging stacked areas, category bars, and combo Bar/Line plots.

## Inspection and comparison

Default legends use rounded color squares and may display inspected values. `Legend` accepts custom item rendering and a compact inline variant. Hovering a legend item and its corresponding plot mark uses shared inspection state. Tooltip rendering is opt-in: mount `Tooltip` inside `Chart` or supply a standalone family's tooltip prop. Plot hover markers remain visible with no tooltip.

`Chart compare` supplies endpoint selection and calculations. `useChartComparison()` and `compare.onChange` expose the complete typed result, including unavailable reasons, signed changes, and optional percentage changes. Consumers render comparison JSX wherever needed; enabling compare does not insert a results panel. `compareObservationValues` computes differences for standalone observation pairs. Pin/release remains visible and accessible.

`createChartController` can link compatible ordered charts, retain inspection across mounts, and control focus. `ChartBrush`, `ChartToolbar`, `ChartReadout`, and `ChartOverview` are optional composition pieces. No D3, Visx, SVG path, or Motion value appears in public props.
