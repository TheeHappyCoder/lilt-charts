# Lilt architecture

**Revision 5 authority:** `architecture-v2.md` replaces the public composition, runtime/interaction ownership and feature-control placement described here. `product.md` owns the Next application and `implementation/04-product-foundation.md` is the current assignment. Retain the data-truth, canonical-curve, lifecycle, dependency and quality requirements below where not explicitly superseded. The API examples and implementation sequence in this older document describe the previous stage.

Architect decision record, revision 3, 2026-09-22. This document, `app-shell.md`, `design.md` and `motion.md` define the intended system. The current repair includes the complete chart interaction inside the user's selected clean-shell application. Unfinished features must not be exported as working no-op APIs.

## Decisions

1. React/TypeScript owns composition; native SVG renders marks; HTML renders tooltips and accessible controls.
2. Use `d3-scale`, `d3-shape`, and `d3-array` as private mathematical utilities. Do not use the umbrella D3 package or D3 DOM selection/transition machinery.
3. Motion owns springs and finite animation progress. It is an internal dependency; consumers configure behavior through Lilt props.
4. Do not add Visx for v0. Its useful geometry is already supplied by D3, while Lilt needs direct ownership of path commands, lifecycle, bounds, and subscriptions. Stable Visx 4 is viable if a specific later feature justifies it.
5. Start with one y scale, time or numeric x, line/area marks, and shared observation rows. No stacking, dual axes, renderer plugin system, date parser, or automatic aggregation in v0.
6. Series are explicit typed descriptors on Chart. Mark children reference series IDs. Do not discover data dependencies by component names, invoke child component functions, or register series through effects.
7. Library code is independent of the showcase, host routing, data fetching, and product design systems.

## Workspace and package contract

```text
lilt-charts/
  AGENTS.md
  docs/
    app-shell.md
    design.md
    architecture.md
  packages/charts/
    src/
      index.ts
      types.ts
      chart.tsx
      chart-context.tsx
      styles.css
      engine/
        normalize.ts
        domains.ts
        geometry.ts
        selection.ts
        lifecycle.ts
      interaction/
        interaction-store.ts
        use-pointer-input.ts
        inspection-layer.tsx
        tooltip.tsx
        tooltip-placement.ts
      motion/
        presets.ts
        use-chart-motion.ts
        geometry-transition.ts
        animated-label.tsx
      primitives/
        line.tsx
        area.tsx
        grid.tsx
        axes.tsx
      lifecycle/
        loading-layer.tsx
        status-content.tsx
  apps/showcase/
    app/
      layout.tsx
      globals.css
      (browser)/
        layout.tsx
        charts/
          page.tsx
          [slug]/page.tsx
        guides/
        qa/
    components/
      shell/
      catalog/
      examples/
      ui/
    lib/
      fixtures/
      catalog.ts
```

This is a responsibility map, not a demand for empty scaffolding. Create files when their assigned stage needs them. Colocate focused tests with the behavior they verify.

Library workspace name: `@lilt-ui/charts`. Showcase: `@lilt/showcase`. Both initially private; naming is local and does not claim an available registry scope. Export ESM JavaScript, declarations, and `@lilt-ui/charts/styles.css`. Scope CSS to the chart root; no root resets, body styling, automatic font downloads, or showcase classes in the library. Mark only CSS as a side effect. Externalize React, React DOM, Motion, and D3 runtime dependencies in the library build. React/React DOM are peers; Motion and D3 are ordinary declared dependencies. Initial React peer support is `^19.0.0`; broader support requires a real consumer check.

Use Vite library mode plus TypeScript declaration emission for the package; Next.js App Router with the actual clean-shell source for the showcase. The showcase imports only the package public entry. A development-only exact package source alias is acceptable and must actually refresh source edits; production and packed-consumer checks resolve built exports. Preserve `"use client"` in the built interactive package entry. Use SSR-safe IDs. App-specific Next/Base UI/Tailwind/fonts never become package dependencies.

Verified tooling baseline from npm on the research date:

| Package | Pin |
| --- | --- |
| react / react-dom | 19.3.0 |
| motion | 13.4.0 |
| d3-array | 3.2.4 |
| d3-scale | 4.0.2 |
| d3-shape | 3.2.0 |
| vite | 8.3.0 |
| @vitejs/plugin-react | 6.1.1 |
| typescript | 5.9.3 |
| vitest | 4.1.8 |
| pnpm | 11.9.0 |

Use matching stable declaration packages and ESLint/Prettier tooling, pinning their resolved versions in the manifest and lockfile. The choices above deliberately avoid prerelease Visx and introducing TypeScript 7 during foundation work. Node 24 LTS is the deployment target. Local Node 25.9.0 and pnpm 11.9.0 were observed; Vitest 4.1.8 accepts that Node version, whereas the latest Vitest 5 manifest does not. Do not change the machine's global Node installation.

The showcase is a Next application with local fixtures and no backend or required environment secrets. Follow app-shell.md for added application dependencies, source provenance and Vercel monorepo configuration. Build the package before Next; use default Next output, not the obsolete Vite `apps/showcase/dist` target or a forced static export. No deployment is authorized.

## Public API

Complete composition required by the current repair:

```tsx
import { Chart, Area, Line, Grid, XAxis, YAxis, Tooltip, type ChartSeries } from '@lilt-ui/charts';
import '@lilt-ui/charts/styles.css';

const series = [
  {
    id: 'revenue',
    label: 'Revenue',
    accessor: (row: RevenueDay) => row.revenue,
    color: 'var(--lilt-series-1)',
    formatValue: (value: number) => usd.format(value),
  },
  {
    id: 'previous',
    label: 'Previous period',
    accessor: (row: RevenueDay) => row.previous,
    color: 'var(--lilt-series-2)',
    line: { width: 1.5, dasharray: '4 4' },
    formatValue: (value: number) => usd.format(value),
  },
] satisfies readonly ChartSeries<RevenueDay>[];

<Chart
  data={days}
  x={{ type: 'time', accessor: row => row.date, format: formatUtcDate }}
  y={{ includeZero: true, format: formatCurrencyTick }}
  series={series}
  height={340}
  aria-label="Daily revenue and previous period, September 2026"
  status={status}
  motion="auto"
>
  <Grid />
  <Area series="revenue" />
  <Line series="previous" />
  <Line series="revenue" />
  <XAxis />
  <YAxis />
  <Tooltip />
</Chart>
```

`ChartSeries<T>` contains `id`, `label`, `accessor: (row:T) => number | null`, optional CSS `color`, optional `formatValue`, and `curve?: 'monotone' | 'linear'` (default monotone). Geometry belongs to the descriptor; Area and Line cannot silently use different curves. A Line adds a stroke, an Area adds only a fill. Both can render the same descriptor without registering it twice.

`ChartProps<T>` contains immutable `data: readonly T[]`, `series`, x config, optional y config, fixed total `height` (default 340px), optional margins/className/style, required accessible name, and children. The time x accessor returns Date or epoch milliseconds; linear x returns a finite number. Formatters consume normalized numeric domain values. Time defaults are deterministic UTC; a consumer can explicitly format another locale/timezone. Strings require consumer-side parsing.

The current repair implements `status: 'loading' | 'ready' | 'error'` (default ready), `error?: string`, `renderRetry?: () => ReactNode`, `motion: 'auto' | 'none'`, and `resetKey?: string | number`. A resetKey change means a different data identity and clears stale retained data and selection.

The current repair also adds `Tooltip`, `YAxis inspectionSeries?: string`, and `Chart onSelectionChange?: (selection: ChartSelection<T> | null) => void`. Export `ChartSelection<T>` with `row: T`, `sourceIndex: number`, `x: number` and `pinned: boolean`. It reports original data, never Motion or D3 objects. Tooltip renders all visible descriptor rows with their formatValue functions and a formatted x heading. YAxis defaults inspectionSeries to the first visible descriptor. Controlled `visibleSeries?: readonly string[]` follows in the reuse assignment; the present legend is informational.

All line/area components are named exports; internal hooks and contexts are not public API. Do not add a second high-level convenience component until the initial composition passes review.

## Data truth and geometry

Normalization occurs once per new data/descriptor identity. Do not mutate the caller's rows. Preserve raw datum/source index, numeric x, and each series' original numeric value or null. Reject nonfinite x, invalid dates, duplicate x, descending x, duplicate series IDs, and nonfinite non-null y with a precise chart error. Do not silently sort, merge, zero-fill, or drop bad rows. Null is a gap, zero is a measured value. All-null visible series produce `No values for this period`.

Require strictly ascending x. Shared rows provide coherent cross-series inspection; independently sampled series must be aligned explicitly by the consumer, preserving missing values. Selecting a row with a null value keeps that series' tooltip row as `No data` and suppresses its dot.

Compute auto y domain over finite values of visible series; include zero by default. For a nonconstant range, first extend to zero if requested, then compute that span and pad outward by 8% of it, keeping a zero endpoint fixed for one-sided data. Apply `nice(y.ticks ?? 5)` once to the target domain; the existing `y.ticks` prop is a D3 tick-count hint, not a promise of an exact count. A positive include-zero range thus has an upper pre-nice extent of max × 1.08. All-zero data with includeZero true uses [0,1]. With includeZero false and constant nonzero c, use c ± max(abs(c)*0.05, 1e-6); constant zero uses [-1,1]. Explicit domains must be finite and strictly ascending and are not expanded. Areas close to zero and are clipped if the consumer chose a domain excluding zero.

An isolated observation renders a small steady mark at its exact value, centered in x when it is the only observation. Its axis shows only the actual observation's date/value. Never fabricate a multi-point line. Empty ready data is a real empty state, not loading. Hidden containers retain their last nonzero dimensions, suspend animation, and recompute when measurable.

### One canonical curve

Use d3-shape line generation with a small drawing-context recorder implementing the commands needed for monotone/linear paths: moveTo, lineTo, bezierCurveTo, closePath. Record separate contiguous valid segments. Derive the SVG stroke string and the area boundary from this same command sequence. Build each area's baseline closure per valid segment. Track isolated points separately.

Keep numeric segment bounds/control points alongside the path. `pointAtX` binary-searches contiguous segments, then evaluates a line or cubic. For a cubic, solve its monotonic x with at most 20 bisection iterations or until <0.05px x error; evaluate y at that parameter. This gives a curve-locked dot without DOM path measurements. Return no point inside a gap or outside that contiguous segment. Do not parse serialized SVG back into geometry.

Every stroke duplicate, highlight, and animated area references the same current geometry object or path MotionValue. Do not read `getAttribute('d')`, `getTotalLength`, or `getPointAtLength` during pointer motion. No per-point DOM nodes for an ordinary line. No Canvas interface is needed now: pure numeric geometry already provides the useful separation.

## State ownership

```text
Chart
  stable geometry/config context: normalized rows, dimensions, target scales,
                                canonical geometry, tick layout, tokens
  per-chart interaction controller: latest coordinates, logical selection,
                                    pin/focus mode, subscribers
  lifecycle controller: accepted snapshot, pending target, phase, generation
  SVG: grid → area → line → hover highlight → crosshair/dots
  HTML overlay root: axis labels, inspection labels, tooltip, status, controls
```

Geometry and axis layout never subscribe to ordinary hover. Dedicated tick-opacity leaves may derive values from the inspection MotionValues, without rerendering the axis tree. The interaction controller is created per mounted chart, not as a module singleton. `useSyncExternalStore` exposes stable logical-selection snapshots to small tooltip/text subscribers. Its snapshot identity changes only for a meaningful selection/configuration change; avoid fresh objects in getSnapshot. The cursor/segment/panel MotionValues are owned by the interaction layer, with one shared cursor-x spring. Update targets in event/effect ownership, not render-time side effects.

Separate geometry transitions from interaction: finite data/domain changes may update dedicated renderer leaves at frame rate; the whole React chart tree must not rerender per animation frame. Axes/grid/series receive coherent progress-derived positions. Memoized geometry uses stable references, not JSON.stringify in hover paths.

Tick keys are numeric values/timestamps, never pixel positions. Cache text bounds on layout/font/formatter changes; the proximity fades use those caches. Use the bounded text renderer from motion.md for changing formatted labels. Its two-layer limit and interruption rules apply at any dataset size. Summary animation belongs to the showcase; it cannot import package internals. Extract a public numeric primitive only after its behavior has been proven, in a later reuse assignment.

## Input and tooltip pipeline

1. Pointer handler records latest client coordinates/type in refs and schedules one frame. It does not bisect or set React state.
2. That frame converts coordinates using cached measured SVG bounds and viewBox/container scaling, subtracts margins, and clamps or clears outside the plot.
3. Binary-search x samples. Earlier sample wins a tie. Compute only the selected row's finite series targets.
4. Deduplicate against x identity, source-data generation, interaction mode, and geometry generation. A data update at the same index must refresh values.
5. Publish a logical snapshot only if changed; update small visual motion targets.
6. Cancel pending frames and clear ephemeral data on exit, pointercancel, reset, and unmount.

Refresh bounds on pointer entry and after ResizeObserver, window resize, or captured ancestor scroll invalidates them. Batch a required measurement before writes in the next frame. V0 supports ordinary unrotated layout and CSS scaling; arbitrary rotated/perspective containers are outside the contract. Tooltip dimensions use ResizeObserver and a first hidden layout measurement; no offsetWidth read on every move. Initialize its clamped first position before visible paint.

Implement the placement/hysteresis formula and mobile detail row specified in `design.md`. The panel stays within the chart container; no default document-body portal or viewport-global measurement. One internal overlay host preserves CSS-variable inheritance. Dynamic formatter content and font changes invalidate panel size. The mobile detail row reserves height so a first tap does not shift the page.

Pin identity is normalized x, not index. A data update retains a pin only if that x survives. If removed, clear it and announce that the selected observation is no longer available. Hover selection is recomputed from the last actual pointer coordinates. Do not extrapolate observations.

## Lifecycle and cancellation

Public data availability and internal visual phase are separate. Internal phases: `pending`, `loading`, `handoff`, `revealing`, `ready`, `updating`, `empty`, `error`. Refresh is an availability flag over a retained ready chart, not a route back through the initial skeleton.

| Event / situation | Required transition |
| --- | --- |
| Initial loading with no accepted data | pending; show skeleton at 120ms only if still loading |
| Ready nonempty data before skeleton appears | revealing for 420ms → ready |
| Data arrives while skeleton visible | handoff (overlap) → revealing → ready; one 600ms clock total |
| First 240ms of handoff completes | remove skeleton; the same real reveal continues, not a restarted animation |
| Loading after ready, same resetKey | retain accepted chart and enable refreshing indication |
| New ready data | updating 420ms matched topology / 240ms topology crossfade → ready |
| Ready empty/all-null data | empty, release inspection; 120ms fade of prior series if motion allowed |
| Error without accepted data | error; cancel loading and release inspection |
| Error after accepted data | retained chart plus refresh-error indication |
| resetKey changes | cancel all work, forget accepted snapshot, initialize from current props |
| Resize while animating | settle to latest target at new measured dimensions |
| Reduced motion enabled mid-transition | stop and commit current target/end phase immediately |
| New target during transition | cancel previous generation; retarget from displayed geometry |
| Unmount | cancel frames, timers, observers, subscriptions and Motion controls |

Each transition has a monotonically increasing generation token, and callbacks can complete only their current generation. Initialize it consistently; the first new transition must not reuse the initial active key. Use a linear elapsed-time clock for choreography and separately ease individual spatial channels. Substage deadlines must not be derived from an already eased fraction. Use completion events for finite animation clocks; do not rely solely on unrelated setTimeouts. The 120ms skeleton delay is a deliberate timer. One failed/disabled series cannot stall the chart lifecycle. Zero dimensions defer rendering; returning dimensions settle from current truth without stale callbacks.

For equal x identities and matching gap topology, morph numeric y values and domain endpoints, then generate paths from the same progress. Do not independently animate path `d` strings. Compute old/new tick sets once and animate their positions with the shared scale; use membership opacity for new/removed labels. Cap overlapping update buffers at two. Changed topology crossfades complete old/new snapshots; interaction/tooltip always reads current accepted values, with dots attached to the current visible target geometry. On repeated updates, snapshot the displayed geometry rather than restarting from an obsolete source.

Skeleton contour (normalized values): [0.38, 0.45, 0.42, 0.56, 0.50, 0.63, 0.58, 0.72, 0.65, 0.77, 0.72, 0.81]. Its own unit coordinates never enter the real-data domain. Render it in a neutral area/contour with axis bars and a coherent sheen. The ready-state axes/grid and incoming series share final domains throughout initial handoff. Initial skeleton-grid transition moves between decorative row positions and final real ticks; no fake numeric placeholder domain is presented as data. The chart's skeleton layers share one progress value. Optional consumer summary placeholders may synchronize the same cycle at a logical loading transition; do not expose a frame-by-frame React callback for that purpose.

## Quality gates

Use unit tests for mathematical/state invariants and browser checks for rendering/motion. Do not write tests that simply restate CSS constants or snapshot large DOM trees.

- Normalization, null segmentation, zero/negative/constant domains, duplicate/unsorted failures, singleton behavior, and exact fixture totals.
- Curve evaluation at samples and along monotone segments; area/stroke identity and no bridge across nulls.
- Nearest selection endpoints, tie rule, irregular x spacing, latest-coordinate frame batching, and reset/unmount cancellation.
- Lifecycle interruption races, stale completion callbacks, fast data, retained refresh, error/empty, reduced motion, and zero-size recovery.
- Real browser: first hover at the far right, rapid scrubbing/re-entry, tooltip flips and long content, edge dots, touch scroll, keyboard range navigation, visible focus and accessible table, theme switch and resize, and three charts with unique IDs.
- Hover profiling: after initial layout, raw pointer moves produce zero geometry/path recomputations, zero axis/grid React commits, at most one selection commit per frame, and no tooltip measurement when content size is unchanged.
- Benchmark target: 6 series × 2,000 points, 960×320 CSS pixels, current desktop Chromium, ordinary hover without chart-attributable tasks >50ms. Record hardware/browser and p50/p95 frame intervals; target p95 <=20ms on a 60Hz display. These are acceptance targets, not established results or guarantees for every device. Do not add decimation to disguise failures.
- Production package build, declaration/type consumption, scoped CSS, duplicate-React check, and a consumer outside the workspace importing a packed tarball.

The visual audit covers 360px, 768px and 1280px layouts, light/dark, reduced motion, 200% text zoom, and a second instance with a different theme. Record what was actually tested. Screen recordings or frame evidence are needed before claiming loading/hover continuity; static images establish appearance only.

## Implementation sequence

1. **Current Assignment 02 — chart workspace:** preserve the user's accepted chart visual direction and clean-shell, simplify component navigation/configuration, correct demo and summary state, provide accurate generated code and accessible inspectors. Follow `implementation/02-chart-workspace.md`.
2. **Chart-contract audit and repair:** resolve the specific unfinished motion, inspection, accessibility and package/performance findings recorded in `reviews/01-repair-audit.md`, and complete the outstanding evidence matrix. The UX revision does not waive those requirements.
3. **Reuse:** extract proven public presets, controlled series visibility and bars through the same foundations; expand consumer documentation.
4. **Release preparation:** full browser matrix, package-consumption and bundle review, Vercel preview only when the user authorizes deployment.

Only the Lilt showcase is migrated to the selected shell. Nova and other applications remain outside scope. The user returns each implementation handoff to the architect; acceptance or a specific repair prompt precedes the next assignment.
