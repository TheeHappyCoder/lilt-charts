# Shared runtime and composable chart surfaces

Architect decision, revision 5, 2026-09-22. This supersedes the old architecture document where composition, interaction ownership, control placement or public API conflict. Its data-truth, canonical-curve, lifecycle, dependency and quality requirements remain in force. Assignment 04 is delivery history; `Chart`/`ChartPlot` and the toolkit are now public exports. Current appearance extensions are listed in [styling](styling.md), and current selection/composition rules in [public contracts](api-contract.md). Examples below are design rationale, not a complete current export list.

## Why this change

The current `Chart` owns too many unrelated responsibilities and places feature UI directly over the SVG. Adding more flags there will reproduce its limitations in every chart family. The package needs reusable behavior and explicit presentation regions; the app needs one coherent way to compose them.

Breaking public changes are authorized during development. Migrate every in-repository consumer and generated example. Do not keep the old composition alive through hidden compatibility branches. Keep the existing stack and independently authored Lilt geometry/motion work.

## Ownership boundaries

| Layer                   | Owns                                                                                                                            | Does not own                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Shared runtime          | lifecycle generations, accepted snapshots, measurement invalidation, motion preference/tokens, stable interaction subscriptions | routes, demo timers, app shell, fetch/transport            |
| Cartesian layout        | ordered numeric/time coordinates, domains/scales, ticks, curve/area geometry, clipping and coordinate lookup                    | sidebar, code generation, dialog focus                     |
| Feature models          | inspect/pin, comparison draft and result, focused domain, visible series, live following, linked ownership                      | pixel-positioned toolbars or framework controls            |
| Presentation primitives | SVG marks, tooltip, toolbar, readout, overview, legend and status views using those models                                      | a second set of feature state or mathematical reducers     |
| Next app                | navigation, fixture/example registry, demo timing, Customize, Use chart, expansion dialog, documentation                        | copied package internals or alternative chart calculations |

Create concrete modules for these responsibilities as needed. Do not create empty packages, a universal plugin registration framework or a dependency-injection container. Line and Area remain the first Cartesian family. Bars will add categorical layout explicitly; radial charts will have their own coordinate model while reusing applicable runtime/motion/UI contracts. No promise that an x-range operation applies to every chart.

## Public composition

`Chart` becomes the HTML runtime/provider root. `ChartPlot` owns the measured SVG and its overlay host. Toolkit components are real HTML siblings in normal flow. Proposed public exports for this assignment:

```tsx
'use client';

import {
  Chart,
  ChartPlot,
  ChartToolbar,
  ChartReadout,
  ChartOverview,
  Area,
  Line,
  Grid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from '@lilt-ui/charts';

<Chart
  data={rows}
  series={series}
  x={xConfig}
  y={yConfig}
  compare={{ series: 'revenue' }}
  focus
  aria-label="Daily revenue, September 2026"
>
  <ChartToolbar actions={chartActions} />
  <ChartPlot
    height={300}
    compactHeight={278}
    margins={{ top: 12, right: 12, bottom: 44, left: 72 }}
  >
    <Grid />
    <Area series="revenue" />
    <Line series="previous" />
    <Line series="revenue" />
    <XAxis />
    <YAxis inspectionSeries="revenue" />
    <Tooltip />
  </ChartPlot>
  <ChartReadout />
  <ChartOverview />
  <Legend interactive />
</Chart>;
```

This illustrates composition; the app's generated component must include complete rows, descriptors, formatter/config definitions and actions or omit optional app-only actions.
Set the previous descriptor's `line` to `{ width: 1.5, dasharray: '4 4' }`; mark styles belong to descriptors so inspection draws the same mark. See `docs/styling.md` for the current appearance API.

### Root and plot

- Keep data, series, x, y, availability/error/retry, motion, resetKey, selection callback, compare/focus/live, visibility and linking on `Chart`.
- Move `height` and `margins` to `ChartPlot`. Height is the complete SVG height, not the combined toolbar/details/legend height. Add optional `compactHeight?: number`, used only when the measured plot container is below 420px. The app supplies height 300 and compactHeight 278. Without compactHeight, retain the specified height (default 340); a consumer's explicit height must not silently cap itself at 278. Reject nonpositive/nonfinite sizes with a precise development error.
- Root and plot accept their own className/style. The root remains transparent, without an app card/KPI/heading.
- Exactly one active `ChartPlot` per root in this stage. Expansion uses the same accepted data/controller in a host-managed alternate view; do not implement several active plots under one root.
- SVG primitives remain inside ChartPlot. Annotations and reference bands retain their coordinate contracts. Overlay components render into a stable local HTML overlay host as needed; never emit HTML control nodes directly into an SVG group.
- Root renders the caller's composition. It must not infer the entire feature model by examining child component names, and cannot rely on `Legend` returning null as a registration marker. The Legend component renders and subscribes to its actual view.
- Keep series descriptors explicit on the root. Do not discover series through child traversal or effect registration.
- Remove the `expanded` package prop: it only describes host presentation. Measurement plus retained interaction identity determines chart behavior.

### Toolkit parts

- `ChartToolbar`: renders optional consumer `actions?: ReactNode` at the trailing end (Data/Expand in the app). It has no built-in Inspect / Compare switch. Live status/Return to live uses this region when live is enabled.
- `ChartReadout`: optional normal-flow text summary. The plot owns the keyboard observation input and compact comparison badge independently of this component. Consumers may build detailed readouts from callbacks.
- `ChartOverview`: renders only for an active focus with overview enabled. It provides context; a separate Full range action restores the complete domain while the comparison answer remains visible. Generate geometry from normalized data into its actual 32px viewport, not a magic scale transform of a full-size path.
- `Legend`: renders visible-series information and optional controls using the root model. Hover/focus emphasizes without changing the domain. Click toggles; expose an explicit accessible Isolate action when allowed. Double-click may be a shortcut, never the only path. All-hidden is a real state, and all checked states stay truthful.
- `Tooltip`: owns floating inspection presentation and its pinned cap. The showcase does not add a default detail row. A decorative chart can omit the toolkit and Tooltip entirely.

These primitives use Lilt-scoped CSS and native accessible elements. Base UI is an app dependency, not a package dependency. The app may supply its own toolbar actions, but does not reimplement Compare/Focus logic.

## Interaction state and detail ownership

Implement a small typed reducer/model with explicit events. Minimum state:

```text
inspection: null | { x, pinned, source }
comparison: null | { startX, endX, series }
draft: null | { startX, candidateX }
focus: null | { startX, endX }
context: null | selected supplied annotation
followingLive: boolean
historyDomain: null | accepted displayed domain
visibleSeries: explicit stable IDs
```

Do not duplicate these values across React effects and control-local state. Only stable logical snapshots go to React subscribers; coordinate-following values use internal Motion values.

| Event                              | Required result                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Click plot                         | pin the nearest actual observation; click it again or press Escape to release                                            |
| Drag plot                          | show a range preview after horizontal intent, snap both endpoints to actual observations, commit on release              |
| Enter on keyboard input            | mark the first endpoint, then commit at a second observation; Escape cancels the draft                                   |
| Complete comparison                | show endpoint marks, selection shade and one compact badge; do not add a default detail row                              |
| Click interval or Focus interval   | focus the committed range, retain its answer and expose Full range separately                                            |
| Full range                         | clear focus only; retain the comparison                                                                                  |
| Escape                             | cancel active endpoint/brush edit, then leave focus, then clear comparison or pin on the next relevant action            |
| Clear comparison                   | clear comparison/draft/its focus; the badge close action supports this                                                   |
| Open annotation                    | give the detail region to supplied event content, with a close action; no pile of competing floating cards               |
| Pin historical observation in Live | freeze displayed history domain, accept incoming observations, show the number beyond that domain                        |
| Return to live                     | clear history lock, settle to latest accepted range through one transition, retain honest data values                    |
| Empty visibility                   | show No series selected, keep legend controls available, no fallback first series                                        |
| resetKey                           | cancel generations, clear local data/interaction identity, reconcile linked ownership without resetting unrelated charts |

The badge is positioned independently of range width, so a one-observation interval remains readable. Its actions are accessible buttons. The plot prevents native text selection during a drag, including over x-axis labels.

Hover alone never announces live-region messages. Commit announcements for keyboard/touch pin, completed comparison, lost selected identity, focus changes and errors. Use one small announcer with deduplicated messages. Do not put `role="status"` on every moving tooltip.

Null endpoints remain No data. Invalid/removed anchors clear or explicitly mark the invalid range according to the documented contract; do not slide it to a different date. Focus cannot create an empty or reversed domain. Consumers can calculate and format additional interval details from the comparison callback.

## Stores, subscriptions and linked charts

Create the per-chart runtime once per mount and dispose its frames, observers and listeners on unmount. A stable geometry/config context does not subscribe to pointer selection. Tooltip/readout, toolbar and emphasis leaves subscribe only to the slices they display. Root and SVG axes/grid/series must not commit for ordinary hover after initial layout. Avoid new-object snapshots from getSnapshot.

Keep `createChartController` as the explicitly supplied group/continuity controller. It shares domain identities and input ownership, not pixel coordinates or whole React trees. One chart owns active inspection. Exact matching is default; bounded nearest matching is explicit. A peer renders its own units and local geometry, and sends selection to its inline readout without opening another floating tooltip. Unmounting a chart clears only its transient ownership and cancels its pending publications; it does not erase a retained pin/range needed for expansion.

Controller actions must be deduplicated and current-generation only. No module-global singleton, implicit cross-chart coupling, or browser access during server rendering. The server snapshot is deterministic. Comparison series IDs must not silently choose a different series in a linked peer; the range can be shared while each chart interprets only explicitly applicable feature configuration.

Retain the public `setComparison({ startX, endX, series })` controller action for programmatic examples. A new programmatic range enters Compare presentation only in a recipient that enables comparison for that series; linked peers stay in their own input mode. `setFocus(range)` moves applicable chart input back to Inspect with retained range context. Local toolbar/readout actions and these public actions use the same transition model, not separate effect-driven implementations.

## Coordinates, frame budget and geometry

Cache measured plot and tooltip bounds. Invalidate on entry, ResizeObserver, captured scroll, relevant font/formatter/content changes and viewport resize. Batch reads before writes; ordinary pointer frames use the cache. Keep latest input in a ref and process at most one scheduled frame. Binary-search the normalized x array and focus index bounds without mapping/filtering all rows on each move.

One current numerical geometry snapshot drives every mark and inspection position. A single finite transition clock interpolates matched values/domain endpoints; easing is applied to spatial channels consistently. Generate canonical line/area segments from that geometry. Do not independently animate serialized `d` strings. Grid/tick coordinates derive from the same current scales, while membership controls entry/exit opacity. Inspection values remain real accepted observations; intermediate rendered positions never become fabricated tooltip measurements.

Changed x/gap topology uses the existing bounded two-snapshot crossfade. No bridges over gaps, DOM path measurement, infinite history queue or repeated initial reveal. A new transition retargets from the displayed state; reduced motion and resize settle/cancel coherently. Preserve the skeleton's pending delay and shared 600ms handoff clock.

Axis label proximity fades use cached label rectangles and light subscription leaves. Bounded number/date text retains at most outgoing/incoming layers, animates changed glyphs, and replaces rapid incoming changes within the existing 75ms policy without restarting an unbounded timer. Apply the same proven behavior to app summary values through an app-level adapter or deliberately exported primitive only if that API is justified; never import package private files.

## App composition and source generation

A typed example/configuration model drives chart props, rendered series, data tables and source generation. Feature support is explicit per example/family; no generic `any` map or a page per copied chart implementation. A small static registry is sufficient.

URL navigation and app demo state have a single coordinator. Render props/accessors/formatters use stable identities where dependencies do not change. Exported components include their public runtime composition and source rows. Keep named example fixtures separate from the package. Any helper included in copied source must be defined there or imported from a real public export.

Use installed Base UI primitives for app tabs/dialogs/drawers and native controls where appropriate. Consolidate shell, workspace and chart-card styles by responsibility; remove verified obsolete catalog/detail selectors rather than appending another override block. Next-specific code remains in the app.

## Package and validation boundaries

Externalize dependency subpaths, including `motion/react`, using appropriate package-prefix matching. Preserve the built client directive, ESM declarations and scoped CSS exports. Confirm source imports, output and actual packed consumers rather than assuming the Vite external array works for subpaths.

The validation matrix includes meaningful reducer/normalization/geometry tests, interrupted transitions, long formatters, all-hidden series, focus retention and linked ownership. Type-only consumption must be supplemented with a Next Server Component importing an actual generated client component, and an ordinary React consumer using the packed public API.

Retain the existing hover budget: six series × 2,000 points, zero geometry/axis/grid React commits on ordinary hover after layout, no repeat layout reads without invalidation, and recorded frame evidence on known hardware/browser. The p95 <=20ms target at 60Hz is a measurement target, not a performance guarantee. Do not add decimation or hide data to pass it.

This architecture permits new chart families to share proven runtime, motion and interaction contracts. It does not mark those future families or every proposed capability as implemented.
