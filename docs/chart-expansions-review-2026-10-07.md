# Existing-family expansions — 7 October 2026

All fourteen additions are integrated into the existing chart categories. Component options live in Props; companion forms and data situations live in the stage carousel. No extra sidebar families were added.

| Addition               | Home and entry point                                                                                  | Encoding                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Indexed lines          | [Line: Indexed growth](http://localhost:5173/charts/line#indexedgrowth); `indexed` in Props           | Each series starts at 100 from its first finite value; inspection and headline use the same normalized values. |
| Forecast fans          | [Line: Forecast fan](http://localhost:5173/charts/line#forecastfan), also Area                        | Supplied nested intervals, ordered widest to narrowest; every bound is inspectable.                            |
| Streamgraph            | [Area: Channel mix](http://localhost:5173/charts/area#streamgraph)                                    | Nonnegative contributions around a centered silhouette, with exact sample inspection.                          |
| Diverging stacked bars | [Bar: Team sentiment](http://localhost:5173/charts/bar#diverging)                                     | Negative and positive response groups around zero; neutral responses split evenly.                             |
| Mirrored bars          | [Horizontal bar: Audience profile](http://localhost:5173/charts/horizontal-bar#mirrored)              | Two positive magnitudes face across category labels on a common scale.                                         |
| Lollipop bars          | [Horizontal bar](http://localhost:5173/charts/horizontal-bar), Props → `barStyle` → `lollipop`        | Signed stems and endpoints retain ranking, inspection and pinning.                                             |
| Treemap drill-down     | [Treemap](http://localhost:5173/charts/treemap), Props → `drilldown`                                  | Explicit group controls open leaves; All groups returns to the root. Leaf selection still pins.                |
| Nested donuts          | [Radial: Spend hierarchy](http://localhost:5173/charts/radial#nesteddonut)                            | Leaf totals determine branch angles; rings show hierarchy with related-branch highlighting.                    |
| Comparative funnels    | [Funnel: Onboarding experiment](http://localhost:5173/charts/funnel#comparativefunnel)                | Two cohorts on one absolute scale, with stage counts and conversion from each entry cohort.                    |
| Goal pacing            | [Progress: Quarterly pace](http://localhost:5173/charts/progress#goalpacing)                          | Supplied actual and planned readings at an explicit cutoff, with target and pace difference.                   |
| Milestone progress     | [Progress: Release checkpoints](http://localhost:5173/charts/progress#milestoneprogress)              | Ordered checkpoints show completed, current and upcoming status against a target.                              |
| Violin plots           | [Box plot: Delivery distributions](http://localhost:5173/charts/box-plot#violin)                      | Kernel density silhouettes, visible median marks and exact sample dots on a common numeric scale.              |
| Correlation matrix     | [Heatmap: Campaign relationships](http://localhost:5173/charts/heatmap#correlation)                   | Pairwise-complete Pearson coefficients, pair counts and related row/column highlighting.                       |
| Scatter trails         | [Scatter: Market trajectories](http://localhost:5173/charts/scatter#scattertrails); `trails` in Props | Consecutive observations within each entity connect in supplied time order; gaps remain gaps.                  |

## Changed implementation areas

- New package modules: `trend-forms.tsx`, `comparison-forms.tsx`, `composition-forms.tsx`, `progress-forms.tsx` and `distribution-forms.tsx`, exported through `packages/charts/src/index.ts`.
- Existing cards extended: `line-chart-card.tsx`, `cartesian-card.tsx`, `horizontal-bar-chart-card.tsx`, `treemap-chart-card.tsx` and `scatter-chart-card.tsx`.
- `observations-card.tsx` supports drill-down controls and scope, explicit unknown headlines, and the shared color override. Companions reuse its shimmer/draw/breathe lifecycle, skeleton opacity exit, entrance, pointer/keyboard pinning, touch inspection, accepted-data refresh and reduced-motion behavior. Scatter now retains accepted points and trails during warm refresh.
- Scoped styles updated in `observations.css`, `horizontal-bar.css` and `scatter.css`.
- Showcase examples and exact generated-source data live in `expansion-variants.ts` and `expansion-data.ts`. Parent chart docs, preview registration, Props controls, loading lab, public API documentation and consumer type probes are aligned with those examples. Companion forms now receive their own Props controls.
- `expansion-cards.test.tsx` adds 71 geometry, lifecycle, interaction and data-truth checks. `docs/product.md` records the retained placement and contracts.

## Review evidence

Desktop and 390 × 844 mobile browser review covered the new forms and modified options. Mobile checks found no page-level horizontal overflow. No browser console errors were observed. The temporary viewport override was reset, global Loading restored to Auto, and held loading released.

Visual review led to a dedicated central stage-label gutter in comparative funnels, formatted goal targets and pace differences, median marks above violin fills, and a centered correlation matrix with distinct negative coloring and fully readable signed coefficients at mobile width. Settled funnel rendering was checked after its entrance animation completed.

Interaction review verified lollipop keyboard pin/release, Treemap Open Platform and All groups navigation, and forecast End/Enter inspection followed by Escape release. The selected forecast reading exposed all four supplied bounds: 95% interval 178–248 and 80% interval 192–234. Shared loading controls exercised Shimmer, Draw and Breathe. Automated checks cover all three styles, motion disabled, keyboard navigation, pinning, refresh retention, empty data and pointer/depth positions for all nine new companion components.

Final validation:

- **958 package tests across 89 files passed.**
- **108 showcase checks across seven files passed**, including generated-source and documentation contracts.
- The focused expansion and observation regression run passed **144 tests**.
- Package TypeScript, built-package consumer type checks and showcase TypeScript passed.
- ESLint, Stylelint and the 31-module CSS contract check passed.
- The production build passed and generated **148 static pages**.
- Changed implementation formatting and the scoped chart/showcase/docs whitespace check passed.

## Data contracts and practical limits

Indexed series whose first finite value is zero have no valid baseline and remain unknown; indexing never substitutes a later starting value. Indexed mode omits forecast envelopes. Forecast bands are supplied by the consumer rather than statistically generated.

Streamgraph values are nonnegative, numeric/date x positions are proportional, and missing contributions break that period's layers. Its centered baseline is not zero. Diverging response bars require nonnegative counts and permit one neutral series. Funnels require nonincreasing counts within each cohort.

Treemap drill-down follows its existing single grouping level. Nested donuts accept leaf paths up to eight levels and count leaves once. Aggregate hierarchy and distribution marks expose a null original datum rather than pretending to represent an individual row.

Goal pacing uses the latest actual reading at or before its cutoff and only interpolates between adjacent known planned readings. Missing values remain unknown. Correlations with constant columns or too few complete pairs remain undefined. Violin density is an estimate; sample dots retain exact numeric positions. Scatter trails do not bridge missing positions, and ambiguous duplicate times suppress that entity's trail.

Existing Cool chart work, earlier audit evidence and unrelated video edits were preserved. Nothing was published or deployed. The repository-wide whitespace check still encounters the pre-existing trailing blank line in `video/src/films/looks.css`; this task's scoped paths pass.
