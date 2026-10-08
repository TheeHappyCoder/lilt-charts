# Lilt motion contract

Architect-owned revision 3, 2026-09-22. The user's requirement is that loading, axes, numbers, and controls feel intentionally animated. The current repair implements this complete chart contract. This document complements design.md; app-shell.md specifies the selected shell's own interaction language.

Revision 5 scope note: `product.md`, `architecture-v2.md` and `implementation/04-product-foundation.md` govern the combined application/library repair. Area/Line fill motion still follows component navigation. The chart motion contract below remains the target, with unfinished behavior recorded in `reviews/03-product-audit.md` and the earlier repair audit. New toolkit regions share the same motion language; passing source checks is not evidence of smooth motion.

## One language, complete coverage

Use `[0.22, 1, 0.36, 1]` for finite spatial changes, near-critically-damped springs for continuous pointer followers, and short opacity fades for small changes. Shared clocks express one data change across several layers. Do not give every element an unrelated delay or overshoot.

Shared choreography uses elapsed time, not a pre-eased progress fraction interpreted as time. Individual channels apply their own ease to their bounded time window. For example, the skeleton must be gone at 240ms of a 600ms handoff regardless of the reveal curve's acceleration. Do not add a second CSS transition to an already animated opacity. Initialize tab/segmented-control indicators at their measured position without an entrance from zero; settle them on resize.

| Surface | Trigger | Required behavior |
| --- | --- | --- |
| Main chart | First ready paint | 720ms soft-edged sweep with coordinated fill/ticks/grid and bounded bar growth; compact charts use 520ms |
| Skeleton | Initial wait >120ms | Full contour/area/grid/axis layout; shared 1800ms sheen +300ms rest |
| Skeleton → data | Ready arrives | Immediate 600ms handoff; skeleton gone by 240ms, real layer already visible |
| Grid and y ticks | Domain changes | Same 420ms scale progress as curves; keyed tick entry/exit |
| X ticks | Range changes | Move by timestamp or crossfade coherent old/new ranges; no index remapping |
| Both axis inspection labels | Pointer or keyboard sample | Shared curve/cursor position, bounded masked number/date change |
| Nearby ticks | Inspection passes them | Measured proximity fades; smooth restoration |
| Tooltip values | Logical value changes | 160ms masked fade/4px translation, changed glyphs where parts are known |
| Y inspection value | Logical value changes | 140ms masked fade/3px translation |
| X inspection day | Logical date changes | 150ms masked fade/5px translation; stable month when unchanged |
| Summary total | Accepted data changes | Changed digits fade/rise 9px in 300ms, 14ms stagger capped at 84ms |
| Opt-in interpolated summary | Accepted numeric target changes | 420ms interpolation from the displayed value; latest target interrupts; changed formatting structure falls back to bounded text |
| Summary delta | Accepted data changes | 220ms masked fade/4px translation, bounded stagger |
| Area/Line control | Mode change | Neutral selected plate slides in 240ms; fill fades in/out in 260ms; stroke stays |
| Tooltip | Enter/exit/side flip | Initialized fade; position and side springs; no remount on flip |
| Highlight, dot, crosshair | Hover/pin/focus | Choreography in design.md; no jump from origin or fly-back on exit |
| Legend | Visible series changes | Swatch/opacity responds; then coherent domain transition |
| Status | Loading/refresh/error/ready | Short 150ms text fade/4px shift; announce once per state |
| Theme | Light/dark changes | Paint color changes, preserve geometry and selection; no reveal replay |
| Resize | Container changes | Settle at measured size; reinitialize clamped followers; no entrance replay |
| Empty/error | Availability changes | 120ms fade; real explanatory content, no decorative shake |

Controls live in the showcase or consumer. The chart library supplies chart motion without requiring that particular card or control design. Legend transition is assigned when controlled visible-series support is implemented.

`Chart`, `Sparkline` and `HorizontalBarChart` expose `animateIn` (default `true`). Setting it to `false` skips first-data and reset entrances without disabling data updates, hover or series visibility. `motion="none"` and reduced motion override all entrances. Toggling the prop on does not replay existing data; use `resetKey` for an explicit replay. Continuous and stacked geometry stays truthful under an alpha sweep; the fill, grid, ticks and vertical bars derive their presentation from the same elapsed clock. Horizontal bars cap their initial row stagger at 90ms and retain the 420ms update timing.

For continuous plots, an update with more than 6,000 row × series samples, or another update within 240ms, commits the latest full geometry directly. This bounds work during dense and bursty refreshes without dropping rows, extrema, gaps or inspection targets. Ordinary smaller updates keep the finite interpolation above; reduced motion still commits directly.

The loading sheen uses an instance-local CSS transform loop over a stationary shape mask. It starts at the plot edge on every loading mount, runs for 1800ms and rests for 300ms. Light surfaces use a darker sheen; dark surfaces use a light sheen. Reduced motion removes the moving band and retains the skeleton. Fast data still skips the placeholder rather than adding artificial loading time.

## Bounded text transitions

Treat formatted text as text, not a list of every possible value. Native numeric/date formatting can use formatter parts to preserve currency symbols, separators and unchanged digits. Custom formatters that supply an arbitrary string receive a bounded whole-label masked fade. Never split an arbitrary localized date on spaces to infer its meaning.

The renderer keeps at most outgoing and incoming content in a clipped slot. Numeric glyphs use tabular figures; reserve sufficient formatted width. Preserve text baselines. A changing digit moves only the specified few pixels and fades; there is no roulette reel, spring bounce, count from zero, or chart-wide blur filter.

The latest logical value is available to accessibility and consumers immediately. Outgoing visual content is aria-hidden and never appears twice in an accessible name. A live region must not announce pointer frames.

When new content arrives less than 75ms after the previous change, replace the incoming target without restarting the active fade. At most two layers remain; finish within the original short transition window, then the next logical update can start another. New data/locale/reset supersedes stale work. Track ownership so an old completion cannot remove the current text. Zero leaks on unmount.

## Axis ownership and grid consistency

Layout determines a bounded set of tick values and their measured labels. Numeric values/timestamps are keys. Geometry changes drive tick positions; pointer changes drive only small opacity leaves and inspection-label leaves.

The grid row and its tick must refer to the same value and the same scale at every frame. Do not interpolate a tick's printed numeric value while leaving the grid in place. Clamp and fade out off-domain ticks. Collapse old/new sets once the shared transition completes.

Inspection opacity is based on the animated marker position and cached text bounds, not the raw pointer. First activation positions everything before visibility. The y label follows the rendered primary curve, not a second spring with a different trajectory.

Use a native SVG gradient with `gradientUnits="userSpaceOnUse"` for a vertical crosshair. An object-bounding-box gradient on a zero-width line can disappear.

## Whole-chart policy

One resolved motion policy covers CSS transitions, Motion values, glyph fades, skeleton loops and stage clocks. With reduced motion: show a steady skeleton while data is unknown, then commit the final data immediately. Do not invent loaded data to bypass a skeleton. Changing the preference mid-transition settles finite work and stops loops.

On hidden tabs or zero-size containers, stop decorative work. Finite updates settle to the latest accepted truth. On return, show that truth without stale entrance events. Interruption, reset, errors and unmount must cancel their callbacks.

## Required motion review

Review more than still images. Capture a short screen recording or an actual sequence of browser frames for loading→ready, a domain change, and rapid back-and-forth inspection. Record which evidence was obtained; no claim of smoothness from a screenshot alone.

Check first hover at both edges, same-index value replacement, rapid updates, one-day and long datasets, more than 60 points, missing values, keyboard navigation, and reduced motion. The final date/value, line geometry and labels must agree after every interruption.

The architect's interactive study demonstrates the intended appearance and timing, but it is not the reusable library, a benchmark, or proof of the full lifecycle and touch contract. Luna implements the documented contracts and returns evidence for audit.
