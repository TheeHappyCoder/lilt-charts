# Changelog

## 0.13.1

- `PriceChartCard` now honors `formatValue` for prices. Instrument comparisons continue to use signed percentages.
- Documentation examples preserve every preview row and timestamp, including period choices and the home page's selected chart. Copyable files include the client directive.
- Completed card prop tables, corrected defaults and feature claims, and expanded the npm README and agent references to include the current chart families and companion forms.

## 0.13.0

Twenty-three new chart families drawn in depth, fourteen new forms for existing charts, and Watch is removed.

- New families, each its own card with key-typed props, the shared shimmer/draw/breathe loading and skeleton exit, hover, pins, keyboard and touch inspection: `SkylineCard`, `BlockCityCard`, `HexCityCard`, `VoxelWaffleCard`, `TerrainCard`, `RidgelineCard`, `SpiralYearCard`, `EventHelixCard`, `ChordLoomCard`, `ArcBridgesCard`, `RankRibbonsCard`, `ParallelRibbonsCard`, `ContourIslandsCard`, `SunburstTerracesCard`, `ClusterConstellationCard`, `TernaryPrismCard`, `WindRoseCard`, `MarimekkoBlocksCard`, `IntersectionTowersCard`, `HorizonFoldsCard`, `CircleArchipelagoCard`, `HelixRibbonsCard` and `VoxelCloudCard`.
- New forms of existing charts: `StreamgraphCard`, `DivergingBarCard`, `MirroredBarCard`, `NestedDonutCard`, `ComparativeFunnelCard`, `GoalPacingCard`, `MilestoneProgressCard`, `ViolinCard` and `CorrelationMatrixCard`.
- New props: `indexed` on Line cards rebases each series to 100; `forecast.bands` draws a fan of supplied nested intervals; `barStyle="lollipop"` on Horizontal bar cards; `trails` and `trailOrder` on Scatter cards; `drilldown` on Treemap cards.
- Shapes that settle from a flat start, such as a terrain lifting off its floor, now play that entrance after a loading state instead of appearing already settled.
- A digit that returns while its previous instance is still leaving keeps the live-reading visibility floor.
- `@lilt-ui/charts/watch` is gone, along with the `normal` and `onNormalChange` props on Line and Area cards, `ChartBoard`, `BoardItem` and `CardFrameContext`. Detect unusual readings where your data lives and draw them with `target`, `forecast` and your own marks.
- A Bar or Area card switching to or from `stack="percent"` no longer counts its headline across units (9,370 → 6,916% → 100%); the new unit starts fresh. Switching into or out of a comparison does the same.

## 0.12.2

Range comparisons show where they stand while you draw them.

- While a comparison is drawn, each wick shows its x label just above the plot, so you know where to let go. Wicks close together share one label, and the labels blur out as the result lands. Reduced motion only fades them.
- The comparison band and wicks fade from the top in the first series colour, and each endpoint has a capsule grip with a soft halo.
- On a ghost card, the badge stands on its own as a rounded glass bar above the header instead of overlapping it.

## 0.12.1

Pins let go the way you expect, and the hover band wears the colour of what it lights.

- Every card that pins (radial, heatmap, funnel, horizontal bar, radar, sankey, scatter, slope, activity ring, and the treemap, calendar, timeline and strip cards) releases its pin on any press that misses the marks: empty plot, elsewhere in the card, or off it, as area and bar charts already did. Escape releases after a mouse pin too. Presses on controls, such as legend items and the period menu, keep the pin.
- The band behind an inspected column takes that column's colour: a falling candle lights red, a rising one green, and the volume pane follows its bars. With several series in a column, it takes the colour of the one being read.
- The docs offer `compare` (off, on, or `'badge'`) in Props on every chart that reads change over time.
- The README covers loading and empty states, long series, and how pins let go, and drops the pre-1.0 upgrade notes.

## 0.12.0

Hover lands with the column it reads, and every chart moves a little more like a real object.

- The crosshair, band, pills and pins share one quick, critically damped spring, so the readout arrives with the column instead of trailing it. Fast moves blur slightly and clear as they land; reduced motion never blurs.
- Areas lift in on first load, from just below into place on the bars' spring, softly blurred until they land. A new period on an area chart runs left to right instead of moving every point at once.
- Horizontal bar rows move in one movement: a leaving row fades where it was while the rest close its gap and re-rank together, and rows that cross pass over and under each other instead of clipping through.
- Bars coloured per row, such as candlestick volume, keep their own colour while they leave.
- Charts load only the Motion features they use: a minimal line card drops from about 137 kB to 125 kB of gzipped JavaScript. Layout animation, used only where rows or board cards reorder, arrives in its own chunk after first paint.
- `llms.txt` groups the cards by job with a one-line hint each, and the READMEs end with a two-line prompt that hands Lilt to a coding agent.

## 0.11.0

Every chart has a quiet empty state, and it can be yours.

- A period with no data shows the same empty state on every card family: a still dot field around "No data for this period" by default, or `empty="shape"` for the chart's own outline at a whisper behind the message. Neither moves, so an empty chart never reads as loading.
- `empty` takes a built-in look, any element of your own, or `null` for nothing. The chart places it in the plot area, inset to the card's padding; an empty card keeps its size. `ChartEmpty` is the built-in look as a component, so `empty={<ChartEmpty>No visits yet</ChartEmpty>}` keeps it with your words. Composed charts take `empty` on `Chart`.
- Empty cards no longer claim a value: the headline reads a dash instead of 0, a supplied `delta` chip steps aside, and every family uses the same wording. An empty radial card keeps its height instead of collapsing to its header.

## 0.10.0

Every chart family now moves with one motion language, and cards are softer by default.

- Added `TreemapChartCard` for flat or grouped part-to-whole layouts, `CalendarHeatmapCard` for UTC daily activity, `TimelineChartCard` for intervals with overlapping lanes, and `StripChartCard` for strip/beeswarm distributions.
- All four include flat/depth paint, shared shimmer/draw/breathe skeletons and the existing opacity exit, reduced motion, retained rows during refresh, header composition, keyboard inspection, pin/release, and consumer-owned selection readouts.
- Treemap has its own showcase page. The other additions live as forms of Heatmap, Range, and Scatter, with matching Preview/Code, data, props, shared settings, and loading controls.
- Period switches morph on lines and areas. When time or number data changes to rows that share x values with the old ones, such as 7 → 21 days, the chart draws both sets while the x and y domains glide: shared points move to their new places, new days arrive from the edge and dropped days leave through it, in one layer. Unrelated rows still cross-fade; reduced motion still switches instantly.
- Every chart family moves the same way. Horizontal bar rows blur while they travel to a new rank and drain away on leaving; radial slices land on the spring, departing slices collapse and new ones blur in; activity ring columns regrow dot by dot round the day; progress and stat rings land on the spring; funnel stages, radar vertices and sankey flows reshape from where they are instead of redrawing; scatter points, observation marks (treemap, calendar, timeline, strip) travel on the spring and departing ones shrink away; heatmap and calendar cells re-colour in a diagonal ripple. A light motion blur passes over each family as its period changes (line, area, combo, range, box and finance charts included; live charts excepted), and nothing animates on a plain resize. Data arriving after the last row grows out of it, so a line draws itself forward.
- Bars snap when the set of bars changes, such as a shorter period. New bars rise out of the floor with a soft blur, rippling in; leaving bars drain back into it and narrow toward the gap, which the rest start closing partway through; bars that stay spring to their new place, width and height. A light motion blur passes over the plot as it happens. Bars are tracked by category on category axes, so a reordered chart moves each bar to its new slot. The first entrance uses the same arrival, so loading a page and changing period feel like one motion. Value-only updates are unchanged, and reduced motion switches instantly.
- Showing or hiding a line or area series glides the y scale in a single layer while the series fades, instead of cross-fading two charts. Bars and stacks keep their existing transitions.
- Cards draw Lilt's own period select instead of the native one: a pill that opens a frosted list of periods, with a blur swap of the chosen label, a highlight that travels between options, and the listbox keys (arrows, Home/End, Enter, Escape, type-ahead) returning focus to the pill. `ChartComponentsProvider rangeSelect={…}` swaps in your own select for every card below it, typed by `ChartRangeSelectProps`.
- Softer cards by default. Elevated cards use a 24px radius and are lifted by tone and a hairline shadow instead of a border. The period select, card actions, delta chip, and axis hover badges are pills. Legend tiles lose their outline. The soft and accent tooltips are frosted glass (opaque under reduced transparency) with an 18px radius. Area fills fade fully to transparent. Colors, palettes, plot backgrounds (dots stay the default), and geometry are unchanged; `--lilt-card-radius` still overrides the radius.

## 0.9.2

Cards can fit inside an existing dashboard widget without duplicating its heading and legend.

### Card composition

- Every chart card accepts an optional `title`, an independent `aria-label`, and `header={false}`. Omitted titles render no title element. Hiding the header removes the headline, delta and period controls without reserving their space. Depth summary stats follow the header; order book column headings and stat ring graphics remain.
- Cards with legend layouts accept `legend={false}` without changing their data, colours or marks. Existing layouts and defaults remain. `surface="ghost"` continues to change only the visual frame.
- Radial cards keep custom centre content, controlled selection and pointer inspection with the header and legend hidden. The graphic supports keyboard inspection and pinning, with a screen-reader data table and no stale readings while loading.

### Fixes

- Escape releases a radial pin in every legend layout, including inline, and requests `onSelectedChange(null)` for controlled selection.

### Documentation

- Family prop tables, card composition guidance, a radial Plot only preview and its generated source, package READMEs, API contract and both LLM references describe the same embedding controls.

## 0.9.1

Charts fit small dashboard widgets, and category cards share their selection with your page. From a first adoption in an existing app.

### Small and fixed-height plots

- The floating tooltip is never taller than its plot. A new `Tooltip` `density` prop, `auto` by default, switches to a compact layout when the panel would not fit: values in two columns, Unpin beside the date, and less padding. Custom content and pin actions follow along, and the panel scrolls as a last resort. `compact` and `comfortable` fix it either way.
- Keyboard inspection no longer opens a second panel over the tooltip. While the observation slider has keyboard focus, the plot takes the focus ring and a shown tooltip carries the key hints in its footer.
- `adaptive` now documents what it reserves: below 420px the readout under the plot keeps about 130px even at rest. Set `adaptive={false}` for a widget with a fixed height.

### Selection you own

- `RadialChartCard`, `FunnelChartCard` and `HorizontalBarChartCard` take `selected` and `onSelectedChange`, so outside filters and a click on the chart share one pinned category. The pin follows the category's name through re-ranking and new values, and a category that leaves the data asks you to clear it.
- `RadialChartCard` takes `colors`, fixed colors by category name, and `center`, which replaces what the middle of a donut shows.

### Docs

- The API reference describes the cards that ship instead of the standalone families they replaced, explains category identity versus label, and states decimation as it works. A test now fails when a guide names something the package does not export.

## 0.9.0

Every chart now leaves its loading skeleton the same way.

### Loading

- When data lands, the skeleton freezes on the frame it is on, whatever point its loop has reached, then sinks toward where the chart grows from as it fades, and the chart makes its own entrance. Line, area, bar, combo, range, box plot, stat sparklines, scatter and the finance charts sink to the plot's floor; horizontal bars, funnels, sankeys, slopes and stat meters to the left edge; radials, radars, heatmaps, activity rings, progress, stat rings and order books to the centre.
- A leaving skeleton keeps exactly the shape it was looping in. Bars no longer flash a different, unanimated skeleton as data lands.
- The fade always completes; on line, area and bar charts the data starts rising just before it ends, so the plot is never empty.
- The exit animates transform and opacity only, so it stays smooth while the chart's first render is busy. Reduced motion and `motion="none"` swap straight to the data.

## 0.8.1

### Fixes

- Data landing on a loading chart no longer flashes the finished chart before its entrance. The skeleton blurs away first, then the chart makes its usual entrance, so the two never share the plot. In 3D the flash showed a full chart for a frame; it is gone in every loading style.

## 0.8.0

A new tooltip, a dotted y axis, a band that lights the hovered column, and a readout that never covers the marks.

### Hover

- The tooltip's date sits in a recessed well, and each row reads marker, name, value, with the value right after its name. The panel hugs its rows.
- With a tooltip or strip readout, the crosshair turns dotted and hovered points become rings. Pills keep their filled hover dots.
- `hover="strip"` docks the reading in a one-line capsule above the plot, centered on the crosshair, so it never covers the marks. The headline rests, as with the tooltip. `Tooltip` takes `layout: 'strip'`.
- Bar and column charts light the inspected column with a soft band behind its bars, arriving in step with the bars that light up. `spotlight={false}` turns it off along with the background spotlight.
- When no pill covers it, the inspected observation's x label brightens.

### Axes

- `axis="dots"` now labels the y axis: each label sits in a gutter with a node and a dotted leader across the plot, and the value pill sits on the axis. The x axis keeps its dot under every observation. Loading skeletons match.

## 0.7.1

### Fixes

- Charts inside a CSS-transformed container lay out at their real size instead of the scaled one. Charts in dialogs that scale in, zoom-to-fit dashboards and scaled previews were drawn squashed: the Cartesian plot, Sankey, Radar, Scatter, Slope, Activity Ring and the Funnel's depth look. Untransformed charts measure exactly as before.

## 0.7.0

Long lines and areas stay smooth to hover from a hundred points to a hundred thousand.

### Drawing

- Line and area marks with more observations than the plot has pixels draw each pixel column's first, last, lowest and highest observation. The ink is the same and every drawn point is a real reading; gaps and provisional or forecast runs keep their edges, and stacked layers still meet.
- The headline, tiles, hover, comparison, Watch and exports still read every row.
- `decimate` on `ChartPlot` and Cartesian cards turns this off. It is on by default.

### Fixes

- Hover no longer rebuilds the plot and reformats every value on each move when a chart is given inline `margins`, as cards do. A 1,000-point, three-layer stacked area hovers at full frame rate instead of about 12 fps.
- Charts with more than about 125,000 values in total draw instead of showing an empty plot. Domains, summaries, box plots, scatter, slope, portfolio and Watch no longer spread every value into a single call.
- Line and area runoff paths are reused between renders instead of being rebuilt on every hover.

## 0.6.0

Charts have three loading styles, with skeletons shaped for each family and refreshed palettes.

### Loading

- `loadingStyle` accepts `shimmer` (the default), `draw`, or `breathe` on charts and cards, including finance charts. `ChartLoadingStyle` is exported for typed consumers.
- Loading skeletons follow each chart's geometry, including candles, range marks, rings, funnels, and flows. Moving skeletons share a clock so cards on a page move together.
- Loading motion respects reduced-motion preferences and `motion="none"`; placeholders do not present invented readings as data.

### Palettes

- Iris uses violet, rose, and amber; Cobalt uses blue, cyan, and indigo; Emerald uses green, lime, and teal. Default series colors follow Iris, with matching light and dark palettes.

## 0.5.0

Every chart that can carry it gets depth with one prop, and legends come in five layouts.

### Depth

- `depth` gives a card depth. Every shape keeps its exact value; depth only adds light, shade and shadow, lit from the upper left.
- Bars, stacks, Combo and stat card bars become square blocks with a lit top and a shaded side; the front keeps the measured height. `barStyle="isometric"` gives the same look.
- Range bars, box plots and candle bodies become solid blocks. Box plot whiskers run through the middle of each block and the median wraps around it; candle wicks pass through the body.
- Radial donuts, pies, half donuts and rings, Progress rings and the stat card ring are lit tubes, with tracks cut into the card as grooves. Angles stay exact.
- Lines on Line, Area, Combo, stat card, Price, Indicator and Depth charts are lit tubes along their own path, with a soft shadow. Dashed references stay flat.
- Scatter points are lit spheres; Slope draws a tube between two spheres, and dumbbells match.
- The Funnel is a pipe: each stage shaded as a cylinder of its own thickness, with curved seams and rounded ends.
- Sankey flows are lit pipes of their exact width and nodes are small blocks.
- Heatmap cells are low tiles of one height; color alone still carries the value.
- Horizontal Bar (`barStyle="isometric"`), the stat card meter and Order book levels are solid blocks; Activity Ring dots are small pucks.

### Legends

- Cards take `legend`: `tiles` (the default), `inline`, `list` rows, tinted `pills`, or `bars` that draw each value against the largest. Radial keeps its own `list` with shares.
- `legendSwatch` sets the mark beside each label: `square` (the default), `dot`, or `line`.
- `Legend` and `ValueLegend` take the same layouts as `variant`, and the marks as `swatch`.

### Breaking

- `OrderBook` names its level count `levels`; `depth` is the 3D switch on every card.

## 0.4.0

Every chart works with a finger, and pins shared across linked charts glide from point to point.

### Touch

- Every chart family now follows your finger: swipe sideways and the highlight moves with it, swipe up or down and the page scrolls as normal, and lift to pin what is under your finger. The click a browser sends after a lift is ignored, so it cannot undo the pin.
- Press and hold for about a third of a second to glide in any direction without scrolling, which makes vertical layouts usable: Horizontal Bar, Heatmap, and the dumbbell layout of Slope.
- Horizontal Bar, Funnel, Radial, Slope, Sankey and Heatmap follow whatever is under the finger as it moves, not only where it first landed.
- Radar and Scatter can be tapped: a tap pins a spoke or dot and a second tap releases it. The Activity Ring reads the time slot from the finger's angle, so a finger can circle it.
- A long press no longer selects text or opens the system menu.

### Pins

- Clicking elsewhere on a chart in a sync group moves the shared pin there and every linked chart glides to it. Before, the linked charts treated the press as a click outside them, released the pin, and every chart's crosshair jumped to the new point.
- Tapping a linked chart moves the shared pin the same way.
- The crosshair and pins keep sliding when the page stalls for a frame, such as while linked charts re-render together, instead of leaping ahead. The pin marker now moves with the crosshair.

## 0.3.0

Charts that know what normal looks like, dashboards that arrange themselves around what needs attention, pins shared across linked charts, and segmented axes.

### Watch

- `normal` on Line and unstacked Area cards watches one series. Layers are off unless set: `limits`, `around` another series with a `tolerance`, `learn` from its own history by `week`, `day`, or `all`, `given` similar conditions, `when` to skip rows such as maintenance, `rules` across series, and `history` to learn from rows the card does not draw.
- The card draws the normal band, recolors unusual stretches, keeps limits on screen, and says "Unusually low since Tue 2 PM". With `breakdown`, an unusual reading says which segment caused it: "98% of the drop is Mobile Safari".
- `onNormalChange` reports whether the series is unusual, how badly, why, and since when.
- `ChartBoard` and `BoardItem`, from `@lilt-ui/charts/watch`, rank cards by what needs attention. Each card carries its state in its glass tab and on its edge: Needs attention with Acknowledge, Seen, Back to normal, or Pinned. Nothing moves while the viewer points at or works inside the board.
- `toast` alerts the viewer to cards that turn unusual off screen, with View; `memory` marks incidents new since the last visit; `onEvent` and its `show()` feed your own alerts.
- The engine is exported for custom UI: `evaluateNormal`, `trackNormalStatus`, `explainReadings`, `explainDeviation`, `describeFlag`, `describeExplanation`, `flatline`, `jump`, `boardReducer`, and `rankBoard`.
- `CardFrameContext` lets a container give the card inside it a tab, an edge tone, and a handle.

### Axes

- `axis="segmented"` draws rounded segments between ticks instead of one continuous line, with y labels beside them; the segment under the pointer lights up.
- `axis` takes one preset per axis, e.g. `{ x: 'minimal', y: 'segmented' }`; an axis left out is `minimal`.
- A segmented axis takes a `gradient` to read as a range: `true` fades the first series' color from faint to full, or pass colors low to high, e.g. `['var(--lilt-positive)', 'var(--lilt-negative)']`.

### Pins

- A click on a linked card pins every card in its `sync` group. The clicked card shows the pin, the others show a ghost of it that names where it came from, and any of them releases it.
- Alt-click (Option-click) pins one card only, and Alt+Enter does the same from the keyboard; linked cards keep following the pointer. `model.actions.pin(x, { local: true })` does it in code.
- Pins travel between points with the crosshair's quick spring, and the pin glyph sits centered in its marker.

## 0.2.0

Finance charts, range charts, and series that carry more than one value.

### Breaking

- A series' `interval` is replaced by `fields`: named companion values in the series' unit, such as a forecast's low and high, quartiles, or a candle's open, high, and low. Fields fit the y axis, appear in hover, and range marks read them by ID.
- `IntervalBand` now names the fields it draws: `<IntervalBand series="revenue" lower="low" upper="high" />`.
- Tooltip content (`ChartTooltipContext.series[]`) has `fields` instead of `interval`.

Cards are unchanged: `forecast={{ from, lower, upper }}` works as before. See "Upgrading from 0.1" in the README.

### Finance, from `@lilt-ui/charts/finance`

- `CandlestickChartCard`: candles, hollow candles, OHLC bars, or a price area colored by direction, with an optional linked volume pane, a log scale, and live mode. Hover reads the candle's open, high, and low beside its date.
- `IndicatorChartCard`: simple or exponential averages and Bollinger bands over the price, with RSI, MACD, or volume panes underneath that move together on hover. Each pane reads its own value.
- `PriceChartCard`: a ticker with its latest price, change, and change in money; `versus` rebases other instruments to percent change on one axis.
- `DepthChartCard`: how much could trade at each price on the buy and sell side, with the gap between the best prices and the total resting on each side.
- `OrderBook`: resting orders as an accessible table, each level with a bar sized by the total behind it; changed levels highlight briefly.
- `PortfolioChartCard`: what an account is worth next to what went into it, with how far it sits below its best value in a linked pane.
- `Candles`, a primitive that draws any number of candles into a handful of paths.
- Helpers: `sma`, `ema`, `rsi` (Wilder), `macd`, `bollinger`, `drawdown`, `rebase`, and `depthLevels`.
- `--lilt-candle-up` and `--lilt-candle-down` tokens, following `--lilt-positive` and `--lilt-negative`.

### Charts

- `RangeChartCard`: floating bars from low to high, or error bars around a value.
- `BoxPlotCard`: quartiles, a median, Tukey whiskers, and outliers computed from raw samples. `summarizeBox` returns the same statistics.
- Primitives: `RangeBar`, `ErrorBar`, and `BoxPlot`.
- `series.colorAt(row)` colors one bar, candle, range, or point, such as a falling day in red.
- `y.scale: 'log'` spaces values by ratio, with ticks on 1, 2, and 5.
- `ReferenceBand axis="y"` shades a range of values, such as RSI 30–70.
- `ChartPlot slots` gives every observation a bar-width slot, so a line pane lines up with bars or candles beside it.

### Fixes

- A card `valueFormat` with more than one minimum fraction digit, such as two-decimal prices, no longer throws.

## 0.1.0

The first release: Area, Line, Bar, Combo, Horizontal bar, Stat, Radial, Progress, Activity ring, Funnel, Heatmap, Scatter, Sankey, Radar, and Slope cards, with linked hover, targets, forecasts, and range comparison.
