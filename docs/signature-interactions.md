# Lilt signature interactions

Historical architect proposal, 2026-09-22. The feature implementation was submitted in `handoffs/03-signature-interactions.md` and reviewed in `reviews/03-product-audit.md`. `product.md`, `architecture-v2.md` and the current Assignment 04 now govern presentation, composition, ownership and follow-up scope. Retain this document as interaction design/background; features are not accepted merely because an export exists. The user wants compelling interaction and animation features that make Lilt desirable to install.

## Direction

Build a continuous exploration sequence: inspect a point, compare two observations, focus their interval, and carry that time selection across related charts. Preserve the user's place as the presentation changes. Give the same care to axes, text, legends and context as to the stroke.

The recommended first signature is **Compare**. It extends Lilt's present curve, selection, highlight and number mechanisms and produces a useful result immediately.

## Proposed features

| Priority | Feature                               | User action and visible response                                                                                                                                                                                   | Product value                                                                        |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1        | Compare two observations              | Select a start and end; a restrained interval fill grows between two cursor anchors, the selected curve stays crisp, and a floating readout presents the two values, absolute change, percentage and elapsed time. | Answer how much a value changed without separately reading and remembering tooltips. |
| 2        | Focus an interval                     | Activate Focus on a selected interval; the interval expands into the plot, dates refine, ticks move through the same transform, and a small overview retains the original range and selected window.               | Investigate detail while preserving context and a clear return path.                 |
| 3        | Linked inspection                     | Inspect one chart; other charts align their cursor/axis badges to the same time, with their own units and values. A pin can stay aligned across the group.                                                         | Read related metrics together in a dashboard.                                        |
| 4        | Series focus                          | Hover/focus a legend item; that line and its endpoint label become prominent while other series recede. Explicit hide/isolate changes smoothly refit the plot.                                                     | Read crowded multi-series plots without losing the overview.                         |
| 5        | Live data with a stable history view  | New observations extend the live edge and update the latest-value badge. Inspecting history pauses automatic following and surfaces a new-points count. Return to live catches up in one controlled transition.    | Make monitoring feel alive while keeping inspection usable.                          |
| 6        | Compact-to-expanded chart             | Open a compact card into a full explorer while its curve, current selection and metric retain identity. Axes and detail controls enter as space becomes available.                                                 | Make a dashboard card a doorway into deeper analysis.                                |
| 7        | Event annotations and reference bands | Focus a supplied event marker; its connector and label unfold at the true timestamp. A selected event window or target band reveals relevant data around it.                                                       | Connect user-supplied context to observations.                                       |
| 8        | Show what changed                     | On request, compare the latest accepted snapshot with the previous real snapshot; show a labeled, faint old curve and restrained difference regions, then settle to the chosen view.                               | Explain a data revision instead of leaving users to remember its former shape.       |

These features extend the existing package; they do not justify introducing another chart library or making the package depend on the showcase shell.

## Compare: the first design to develop

Use a visible Compare action to make the interaction discoverable and to separate it from ordinary hover, pin and touch scrolling. Pointer drag, two-tap touch input and keyboard start/end selection must reach the same underlying range state. Do not silently repurpose mobile horizontal scrubbing.

The active state has two observation anchors keyed by normalized x. Start remains fixed while end follows the nearest actual observation. Resolve sample values immediately; ease marker positions using the existing cursor response. At confirmation, settle the readout and retain the range until it is cleared or replaced.

Visual treatment:

- Two thin cursor lines and small endpoints on the actual curve.
- Jade interval tint around 0.06 opacity; selected stroke at full opacity, surrounding stroke around 0.30.
- A compact comparison readout, 180ms fade with 4px movement, inside chart bounds.
- Endpoint dates use Lilt's bounded text transitions. Merge into one range label when two separate badges would collide.
- Comparison numbers update in 140–160ms masked slots, with unchanged digits and symbols retained.
- The selected time range highlights without changing the chart's scale. Only an explicit Focus action changes the visible domain.
- Reduced motion keeps the exact same functionality and commits position changes directly.

For the original revenue fixture, Sep 4 is $1,480 and Sep 22 is $2,360: the comparison reads **+$880 / +59.5% / 18 days elapsed**. This is the change between daily observations, not a period total. A sum/average requires an explicitly configured reducer and an honest label; the package must not invent metric semantics.

Missing endpoints produce No data and no invented delta. A zero start value permits an absolute change but no finite percentage; show an unavailable percentage. Signed/negative baselines require an explicit consumer percentage policy. Geometry gaps remain gaps.

A data update refreshes the anchors' values if their x identities survive. Removing an anchor clears the unavailable comparison with a concise explanation. No index-based remapping.

## Focus: continuity through a change of scale

The selected range, main plot and overview use one domain transition over approximately 420ms with the existing spatial ease. Readouts continue reporting real accepted values. Old/new tick membership can crossfade while surviving tick values move; there is no count through fabricated dates or values.

Keep a labeled full-range context strip and an explicit Show all action. Focus is on the chosen observations; it does not automatically aggregate data. Coarser/finer aggregation, if introduced later, needs declared consumer semantics and separate identity mappings.

Zoom uses a clamped domain transform. Do not apply spring overshoot to the numerical domain, invent data beyond its ends, or replay the loading entrance. Selection anchors remain meaningful when focusing/restoring.

## Linked inspection: one time, several units

Share normalized x and interaction ownership through a per-group controller. Every chart maps x through its own scale; do not forward pixel positions or array indices. Preserve local y units and formatting.

Use exact timestamps by default. For differently sampled series, a consumer can explicitly choose nearest observation with a maximum distance; otherwise show no observation. Never present a sample from an unrelated time as aligned data.

A group has one active input owner, loop-free propagation and one scheduled update per frame. The originating chart can show the full floating tooltip while peers show compact readings to avoid several panels covering the dashboard.

In a small-screen layout, paired readings may move into a shared detail strip. Keyboard navigation participates in the same group behavior.

## Other features: essential constraints

**Series focus:** hover is emphasis only and never changes the y domain. Only an explicit visibility/isolation action changes scale. Preserve custom stroke styling, use a short opacity transition, and animate endpoint-label placement with collision handling. The legend is keyboard accessible.

**Live data:** animate accepted updates rather than a perpetual idle pulse. Buffer/coalesce rapid arrivals, keep bounded geometry history, and never queue one long animation per point. Pause auto-follow when users explore history; keep newly accepted data available behind the new-points control. No automatic sound, haptics or vibrating numbers.

**Expansion:** the host owns the expanded surface and focus management. The package supplies continuity of geometry/selection across a new measured size. Preserve accessibility and a usable instant fallback; do not couple the library to Next routing or a particular portal/dialog system.

**Annotations:** events, targets and explanations are supplied by the consumer. Reveal exact associations; do not infer that an event caused a change. Keyboard focus and touch can reveal the same content as hover.

**Change comparison:** compare actual snapshots with compatible units and x identity. Label the old snapshot. Null gaps and new/deleted observations remain explicit. Difference fills require matched valid segments; never morph unrelated paths into fictional intermediate data. Keep this mode opt-in so a routine refresh stays easy to read.

## Motion grammar

Immediate feedback establishes what the user selected. Cursor/endpoint movement responds fastest; text resolves in a short bounded fade; supporting panels arrive slightly more softly. Finite domain changes use one clock across paths, grid and axes. All work is interruptible and settles when idle.

Decorative distortion of the data curve, chart-wide bounce, number reels, constant shimmer on known values and unrequested particle effects do not belong in this direction.

The pending axis-proximity, bounded-text, input/accessibility and hover-render findings in `reviews/01-repair-audit.md` must be addressed before the first signature feature is accepted. Those foundational fixes are not additional headline features.

## Recommended sequence and demonstration

After the current workspace revision is audited:

1. Complete the relevant existing interaction/text/performance contract and deliver Compare as one fully verified feature.
2. Add Focus with its overview and reversible range transition.
3. Add Linked inspection across a small set of related charts.
4. Add series focus/controlled visibility, then live data, according to the first real consumer need.
5. Treat expansion, annotations and snapshot comparison as separate bounded assignments.

The intended short demonstration is: inspect a point → compare an interval → read its exact change → focus the interval → inspect aligned metrics → return to the full timeline. The demonstration is user-driven and uses the same published primitives a consumer installs. Do not ship a showcase-only implementation.

## Research context

Official references checked during this proposal:

- [TradingView Lightweight Charts: synchronized crosshair positioning](https://tradingview.github.io/lightweight-charts/tutorials/how_to/set-crosshair-position) shows coordinating chart crosshairs.
- [TradingView Lightweight Charts: realtime updates](https://tradingview.github.io/lightweight-charts/tutorials/demos/realtime-updates) shows incoming updates and returning to the live edge.
- [Apache ECharts: data transitions](https://echarts.apache.org/handbook/en/how-to/animation/transition/) documents transitions between data states.
- [Apache ECharts: universal transitions](https://echarts.apache.org/handbook/en/basics/release-note/5-2-0/) demonstrates identity-aware transitions, grouping and drill-down.

These establish that individual mechanics already exist in charting tools. Lilt's proposed distinction is a consistent composed experience with precise data identity, shared timing, responsive input and a small reusable API. No claim of market uniqueness or measured competitive superiority is made.
