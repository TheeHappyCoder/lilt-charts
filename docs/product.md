# Lilt Charts product scope

Current direction: 24 September 2026. This document supersedes earlier app-flow and family-expansion plans where they conflict.

## Card layer (25 September 2026)

Each family is moving to a zero-config card (`AreaChartCard` first) with key-typed `x` and `series`, derived headline, delta, tiles, and hover sync, built on public `ChartCard*` parts and the existing `Chart` primitives. Family doc pages read top to bottom: intro, one preview frame with Preview/Code, usage, all variants live with their code, data, hover, and props. Variants are props, not sidebar entries or a Customize panel. Area is the pilot at `/charts/area`; Stacked Area folds into it.

## Chart pages: three homes for every control (5 October 2026)

A chart page has one stage and every control has exactly one home. This supersedes Looks; the Lab (Customize) pages stay free showcases where readers switch anything.

- **Variants** are what the chart handles: its situations and data (a target, a forecast, missing values, another kind of data, a companion form). Each is dressed in the look chosen for it, so the carousel shows the family's range. The default card comes first. A form one prop makes (stacked, percent, step, needles, pie, hollow candles) is not a variant, and neither is a copy of the default with another period.
- **Props** (in the stage's tab) are this component's own props: `stack`, `barStyle`, `curve`, `radius`, `variant`, `display` and the like. Changing one updates the card in focus and its printed code.
- **Chart style** (the style notch) is how every chart on the site looks: palette, depth, surface, background, axis, hover, legend, numbers, loading and theme. None of these appear on a chart page; Props says so and opens the notch. A variant that sets one of them for itself is named in Props.

## Features (29 September 2026)

The sidebar has one Features group for what charts do, beside Charts and Finance for which chart to use and Lab for how charts look: Sync hover, Pin, Compare, Targets & forecasts, and Performance. Each page follows the Lab pattern of a one-line lede, one control bar, and a live stage. New capabilities join Features instead of adding sidebar groups.

## Observation additions (4 October 2026)

Treemap joins Part of a whole. Calendar heatmap is a form of Heatmap, Timeline intervals are a form of Range, and Strip/beeswarm plots are forms of Scatter. Their public cards are `TreemapChartCard`, `CalendarHeatmapCard`, `TimelineChartCard`, and `StripChartCard`, all from the main entry point. Companion forms keep their own typed props and generated source within the existing family page.

All four support flat and depth treatments, the shared palette/surface controls, header composition, keyboard inspection, pin/release, and accessible readings. Loading uses the existing shimmer/draw/breathe paint and the shared 240 ms skeleton opacity exit, followed by the data entrance. Refreshes retain accepted rows; reduced motion skips decorative motion. Treemap is flat or grouped one level; Calendar uses UTC dates; Timeline packs overlaps without task editing or dependencies; beeswarm changes only the category offset and preserves numeric positions.

## Existing-family expansions (7 October 2026)

Fourteen additions extend the existing categories without new sidebar families. Line gains `indexed` growth and Line/Area forecast envelopes gain supplied `bands`. Horizontal Bar gains `barStyle="lollipop"`, Treemap gains explicit group drill-down with a breadcrumb, and Scatter gains ordered trails that break at missing coordinates.

Nine typed companion exports live inside the existing family pages: `StreamgraphCard` under Area; `DivergingBarCard` under Bar; `MirroredBarCard` under Horizontal Bar; `NestedDonutCard` under Radial; `ComparativeFunnelCard` under Funnel; `GoalPacingCard` and `MilestoneProgressCard` under Progress; `ViolinCard` under Box plot; and `CorrelationMatrixCard` under Heatmap. Companion forms now receive their own Props menu. Their previews, printed source, loading showcase, public consumer types, and family documentation remain aligned.

The observation companions share shaped shimmer/draw/breathe placeholders, skeleton opacity exit, entrance, pointer/keyboard inspection, touch glide, pin/release, accepted-row refresh, and reduced motion. Missing counts never fill stacks, hierarchy totals count leaves once, correlation uses complete pairs and leaves constant series undefined, pacing uses an explicit cutoff and supplied plan, and zero indexed baselines remain unindexable. Scatter refreshes retain accepted points and trails. No chart estimates a forecast.

## Sculpted Cool families (7 October 2026)

Cool also includes Chord loom, Rank ribbons, Event helix, Contour islands, Parallel ribbons, and Arc bridges, each with its own card export, props, page, and data contract. Chord loom and Arc bridges encode weighted directed links; Rank ribbons derives period-by-period competition ranks; Event helix places timestamped events on UTC daily or weekly turns; Contour islands estimates weighted observation density with actual points kept inspectable; Parallel ribbons normalizes separate numeric axes without summing unlike metrics.

All six share the observation-card hover, keyboard, touch-glide, pin/release, accepted-data refresh, accessible readings, and reduced-motion contracts. Ribbons use their closed silhouettes for pointer hit testing. Each family has a shaped shimmer/draw/breathe placeholder, the common skeleton opacity exit, and a staggered data entrance. Missing values do not invent connections or positions. These additions extend Cool rather than creating another sidebar group.

## V1 scope

The product is one React/TypeScript chart package and one Next.js documentation browser. Retained families are Area, Line, vertical Bar, stacked Area and Bar, category Bar, Horizontal Bar, Stat cards (the `StatCard` with a sparkline, bars, meter, or ring), Radial, Progress, Activity Ring, Combo, Funnel, Heatmap, Scatter, Sankey, Radar, Slope (added 27 September, with slope and dumbbell variants), Range and Box plot (added 28 September). Finance families (Candlestick with volume, Indicators with RSI/MACD/volume panes, Price, Depth, Order book, Portfolio) were added 28 September for 0.2.0 and ship from `@lilt-ui/charts/finance`. The Labs pages remain as showcase tools for exploring colors, backgrounds, surfaces, axes, loading, hover, and numbers.

The browser keeps the clean-shell sidebar and Manrope. Each family has one chart card with Preview, Code, Data, Setup, and anchored Customize. Preview data and copyable code must agree. The sidebar navigates chart families and essential guides. Variations live inside their family route.

The package gives polished default color, rounded-square value legends, optional compact dot legends, readable hover values, linked legend/plot inspection, signature plot hover marks, accessible pin/release, and opt-in tooltips. Consumers can compose legends and comparison differences in their own JSX, including a header, footer, card, or separate panel. Comparison state and arithmetic are exposed without adding a hardcoded results section.

Data truth matters: null is missing, zero is measured, gaps stay gaps, updates retain accepted values, and reduced motion removes decorative motion while preserving inspection feedback. All retained families support their relevant interaction model, responsive preview, and usable keyboard access.

Bullet, Waterfall, Histogram, separate Examples/Templates and recipe galleries, the commerce template, registry output, and recipe maintenance are removed from v1. Historical design and handoff docs remain as records; they do not re-enable those surfaces.

### Spatial Cool families (7 October 2026)

- **Sunburst terraces** at /charts/sunburst-terraces: A hierarchy steps outward through circular terraces; each branch owns its share of the ring. Supply leaf-only slash-separated paths, up to eight levels. Branch angles sum known leaf values; missing leaves do not invent area. Zero and missing readings remain in the data table. A path cannot also be an ancestor. Branch selection returns a null datum with a calculated total; leaves return their original row. Terrace height is decorative.
- **Cluster constellation** at /charts/cluster-constellation: A spatial network of shaded nodes and curved links, with the inspected node’s neighbours kept in view. Supply unique labels, finite XYZ coordinates and arrays of neighbouring labels. Links are undirected and deduplicated; self-links and unknown endpoints are rejected. Positions come from your data rather than a random force simulation. Node area carries magnitude. Missing positions stay in the table. The headline counts located nodes.
- **Ternary prism** at /charts/ternary-prism: Three competing ingredients find a position on a triangular floor, while magnitude rises above it. Three distinct nonnegative measurements are normalized to shares; their original units must be comparable. The floor position encodes the shares, and column height encodes value. A missing part or all-zero composition has no position. The resting headline counts located compositions.
- **Wind rose** at /charts/wind-rose: Compass petals divide a directional distribution into stacked magnitude bands. Pre-bin observations into equal sectors. Direction is the centre angle, north at 0°, clockwise, and must be a multiple of 360 / sectors. One row per direction and band. Petal area is proportional to frequency, so radius follows the square root of cumulative frequency. Missing and zero values retain distinct table entries.
- **Marimekko blocks** at /charts/marimekko-blocks: A segmented floor of equal-depth slabs makes category size and composition visible together. One row per category and segment with nonnegative value. Column widths reflect known category totals; subdivisions reflect their shares. All top areas use the same scale and every slab has equal depth. Gaps sit between columns. Missing values are excluded from the known total, retained in the table and never interpreted as zero.
- **Intersection towers** at /charts/intersection-towers: Exclusive set overlaps rise as towers above the membership dots that define them. Each row is an exclusive intersection: it belongs to exactly the listed sets and no others. Supply a nonempty array of distinct set names and a nonnegative size. Set order inside a row does not change identity; duplicate intersections are rejected. Missing sizes remain outlined, and sorting puts them after known values.
- **Horizon folds** at /charts/horizon-folds: Signed time series fold into compact bands so many patterns can be read on the same scale. One row per series and numeric time. Samples sort by time within each series. All series share one absolute magnitude scale. Positive values use the first palette color and negative values use the fourth; deeper color represents higher bands. Missing samples break the shape. Inspection reports the original signed value, and the resting headline is the mean of known values.
- **Circle archipelago** at /charts/circle-archipelago: Nested islands of circles reveal a hierarchy while leaf areas keep a common value scale. Use unique leaf-only slash-separated paths and nonnegative values. Every leaf radius uses the square root of its value with one common scale, even across branches. Enclosing circles are grouping boundaries, not total-value bubbles. Missing and zero leaves have no invented area. Deterministic packing keeps siblings separate.
- **Helix ribbons** at /charts/helix-ribbons: Recurring signals wind upward as ribbons, aligning the same phase across successive cycles. Supply an integer cycle and a phase from 0 inclusive to 1 exclusive, with nonnegative magnitude. Cycles must span at most 25 consecutive turns. Width interpolates between known samples; null values or gaps larger than maxGap break the ribbon. Concentric lanes separate series without shifting their measured phase. Beads preserve individual samples.
- **Voxel cloud** at /charts/voxel-cloud: A genuine XYZ scatter of lit cubes, with camera rotation and slices through the original z values. Supply unique labels, XYZ coordinates and nonnegative magnitude. Each coordinate has an independent linear scale and equal-valued axes are centred. Positive cube volume carries magnitude; zero and missing magnitudes use small distinct inspection markers. Slice bounds are inclusive in original z units and do not rescale the camera. All rows remain in the table, including missing and sliced-out positions. The headline counts visible positioned observations.

These families reuse the observation inspection state and shimmer/draw/breathe lifecycle, skeleton opacity exit, reduced-motion handling, keyboard and touch pinning. Their own geometric controls live in Props; palette, surfaces, depth treatments and loading stay in the shared style notch. Generated examples use the same datasets as their previews.
