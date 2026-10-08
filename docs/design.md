# Lilt visual and interaction specification

**Revision 5 authority:** retain the visual language and numeric chart contracts below. `product.md` and `architecture-v2.md` supersede app composition, toolbar/readout placement, mobile empty-space behavior, interaction arbitration and public composition. Assignment 04 is current; implementation claims from earlier handoffs remain subject to `reviews/03-product-audit.md`.

Status: architect-authored v0 direction, revision 3, 2026-09-22. The current repair includes the full skeleton, inspection, animated axes and text, inside the user's clean-shell app. Values below are implementation targets, not claims of measured production performance. Luna implements them without substituting its own style. Read `app-shell.md` for application composition and `motion.md` for coverage and cancellation.

## Character

Precise, responsive, and visibly expressive on interaction. The data is the strongest mark on the surface. Generous plot space, thin neutral grid lines, a restrained colored stroke, and a small readable tooltip. Every visible state change has designed motion, including axes and text. The resting chart settles completely; input, loading, and changing data bring it to life.

The chart component has a transparent background and no built-in card, heading, KPI, or product navigation. The showcase supplies those. This allows the same chart to live in a card, a report, or a large analytical view.

## Palette and typography

All library styles are rooted under `[data-lilt-chart]` and use overridable `--lilt-*` variables. The chart inherits the consumer's font. The showcase uses **Manrope**, loaded once by the Next app, with tabular figures for numeric content. The table below defines portable library defaults; app-shell.md defines the intentional neutral overrides inside the clean-shell browser.

| Token | Light | Dark |
| --- | --- | --- |
| `--lilt-surface` | `#FFFFFF` | `#191D1B` |
| `--lilt-text` | `#202923` | `#EAF1EC` |
| `--lilt-muted` | `#66736B` | `#9AA99F` |
| `--lilt-grid` | `#E8EDE9` | `#2B342E` |
| `--lilt-border` | `#E0E7E1` | `#354139` |
| `--lilt-series-1` | `#168267` | `#67D9AF` |
| `--lilt-series-2` | `#89968D` | `#879A8C` |
| `--lilt-series-3` | `#B7742D` | `#EDBD7B` |
| `--lilt-series-4` | `#6E66B5` | `#B7A9F0` |
| `--lilt-focus` | `#13745C` | `#83E5BF` |
| `--lilt-tooltip-bg` | `var(--lilt-axis-active)` (`#37352F`) | `var(--lilt-axis-active)` (`#D9D9D8`) |
| `--lilt-axis-active` | `#25332B` | `#DCE9DF` |
| `--lilt-axis-active-text` | `#FFFFFF` | `#19251E` |
| `--lilt-skeleton` | `#BDC9C0` | `#617467` |
| `--lilt-skeleton-sheen` | `#FFFFFF` | `#BACABE` |

The floating inspection tooltip and comparison card use the exact X/Y hover badge background and foreground colors by default: dark in light mode, light in dark mode. Their surface is opaque so it stays the same color over every part of the chart; a soft shadow and fine border provide depth. Consumers can override the scoped tooltip background, text, muted text, border, focus ring and shadow tokens. Radius 10px; padding 12px; row gap 8px; date line separated by 10px of space. Default floating width 188px, bounded by container width minus 16px. Keep the floating panel at one upper-plot height while its horizontal position follows the selected observation. Hover tooltips do not intercept pointer movement; a pinned tooltip accepts input for its actions.

Axes and date labels: 12px/16px, weight 400. Tooltip title and values: 13px/18px, weight 500. Tooltip row names: 12px/18px. Numeric content uses tabular numerals. Labels remain neutral, not colored to match series. Series color is accompanied by a legend swatch/line style and an explicit name. Tooltip swatches lift the same series hue on a dark tooltip surface so they remain as visible as the chart marks. At 200% text zoom labels must reflow or reduce density, never shrink below 12px.

The showcase retains the actual clean-shell SaaS frame and the chart's visual language. Current workspace composition, card padding, header density and control placement are specified in `implementation/02-chart-workspace.md`. The left-aligned title/KPI and lower legend remain; component navigation now selects Area or Line. Do not reintroduce a duplicate in-card family selector or the superseded catalog/detail-tab layout.

## Resting chart

- Generic Chart default total height is 340px. The reference detail uses total SVG height 330px at chart widths >=420px, 278px below, plus a separate reserved 112px detail row below 420px. Those total SVG heights include margins.
- Default margins: top 16, right 16, bottom 44, left 72. The showcase may increase left margin for long currency labels. Reserve 8px inside plot edges for endpoint markers. The left gutter must accommodate the active value label as well as ordinary ticks.
- Primary line: 2–2.25px, round caps/joins, full opacity, monotone interpolation. Secondary comparison line: 1.5px, dash `4 4`, full opacity in a quieter neutral colour. No dots on every sample.
- Primary area: vertical gradient from 0.26 opacity at plot top to 0.015 at baseline in light mode, 0.22 to 0.012 in dark mode. Its boundary is the exact line geometry. Never double-stroke an area.
- Every visible series reads clearly at rest. Bars and radial slices use full mark opacity; stacked areas use a stronger 0.62 fill. Saturation belongs to the data marks, while the shell, axes and grid stay quiet. Green remains the primary series colour.
- Target five horizontal ticks on a normal plot; target three on plots shorter than 160px. No vertical grid by default. Solid 1px neutral lines with a soft horizontal fade at the outer edges. Zero baseline may use the border token when negative values are present. In the revenue showcase, use the existing `y.ticks: 4` D3 hint for nicening/tick intervals, yielding 0–4k initially and 0–5k after the specified update. Put USD in the subtitle and use `0`, `1k`, `2k` rather than repeating the currency sign.
- Time x tick target: `clamp(floor(innerWidth / 110), 3, 6)`, capped by available observations. Choose unique indices `floor(i * (n - 1) / (count - 1))` evenly from first to last actual observation, then remove colliding interior labels using measured bounds. Handle a singleton separately. Keep both endpoints whenever they fit; at the narrowest width show their dates in two anchored slots. At 360px chart width use at most three date labels; for the 28-day fixture the three indices are 0, 13 and 27. Numeric x may use ordinary numeric scale ticks. Never rotate or shrink labels.
- No overshooting natural spline, fake smoothing of source data, or decorative point pulses. Hover changes the axis inspection labels and nearby label opacity; it does not alter the data scale.

## Hover choreography

Selection is the nearest actual observation in x; ties choose the earlier observation. Tooltip text always reports original sample values. Pointer y does not change which series is selected: display all visible series at that x.

| Layer | Target behavior | Motion |
| --- | --- | --- |
| Crosshair and dot x | One shared x signal for exact alignment | spring stiffness 360, damping 38, mass 1 |
| Dot y | Evaluate the drawn curve at that animated x | Derived from geometry, no independent y spring |
| Bright segment center and width | Track the selected sample neighborhood | spring 220 / 30 / 1 |
| Floating tooltip anchor | Follow selection slightly more slowly | spring 120 / 22 / 1 |
| Tooltip side offset | Switch sides while retaining the panel | spring 420 / 42 / 1 |
| Base series dim | Marks only: opacity 1 → 0.24 on entry (bars 0.26), restore on exit. Axes and grid remain readable. | 140ms entry / 180ms exit |
| Overlay visibility | Fade in at its initialized location | 100ms entry / 120ms exit |

All springs are deliberately near critically damped: soft travel, no visible oscillation. An OS reduced-motion preference or `motion="none"` bypasses every positional spring and all looping effects.

On the first active sample, initialize all visual positions, panel side, and segment bounds using `.jump()` before making them visible. Repeat after pointer re-entry or interaction reset. Exiting freezes the current positions while fading out; never animate them back to zero.

The 1px crosshair uses the muted token at 0.45 opacity and fades over the top/bottom 12px. The active dot has a 3.5px colored radius and a 2px surface-colored ring. A 7px-radius halo at 0.10 opacity is optional in the standard preset; it does not pulse.

The highlight reuses the exact canonical stroke path. Its neighborhood spans the neighboring observations, but cap the visual width to 64–144 CSS pixels, then to available plot width. Position it around the selected x and clamp its edges inside the plot. Use a 10px feather at each edge via an SVG alpha mask; no blur filter or glow. Render highlights for all visible series, preserving each line's stroke style. Never bridge a null gap to create a highlight.

Keep dots on the curve while traversing consecutive valid points. If motion crosses a null gap or changes to a disconnected segment, fade the dot out/in at the destination; do not show a dot floating across missing observations. A selected null value has no dot and reads `No data` in the tooltip.

Tooltip placement: default to the right of the selected x, with 16px gap; preferred y is plot top + 12px. Flip left when the right cannot fit. Retain the current side until the alternative has 12px spare room to avoid boundary flutter. Clamp the final animated panel to the chart surface with an 8px inset on both axes. At narrow widths, use a full-width inset panel in a reserved detail row below the plot rather than covering the chart. Threshold: chart width <420px. Do not remount the content or replay a scale entrance on every flip. Values use a short masked fade on change; never traverse a reel of intervening numbers.

### Both axes participate

The x-axis inspection label is 26px high, 7px radius, with the neutral inverse surface/text tokens above. Default date width 76px; measure wider consumer formatting. It shares the cursor x spring and clamps independently inside the plot. Default UTC date formatting uses a stable month and animated day digits, produced from formatter parts rather than splitting arbitrary date strings. Changed day digits fade/translate by 5px in 150ms. Both short and long datasets use the same bounded two-layer mechanism; never create a stack of every date.

Neighboring x ticks recede smoothly as the moving label approaches. Use actual cached label bounds: overlap means zero opacity; a separation of 18px means full opacity; interpolate between. Restore over 180ms on exit. The tick positions themselves remain at their data coordinates.

The y-axis inspection label is also 26px high and uses the same inverse treatment. It shows the selected primary series' exact formatted value, occupying the left gutter. In the revenue showcase its width is 65px. Its center y is derived from the SAME animated curve point as the primary dot, with edge clamping. A thin 0.22-opacity dotted guide extends from the gutter to that dot. The label's digits fade/translate by 3px in 140ms. Nearby ordinary y labels fade out within 20px of its center and return across the next 20px. A missing selected value hides this label and guide.

Only one series drives the y inspection label; default to the first visible descriptor, with an explicit `YAxis inspectionSeries` override. The tooltip still reports every visible series. These labels are optional inspection aids, not alternate scales.

On data/domain changes, preserve ticks by numeric value or timestamp. Shared ticks move with the interpolated scale; entering ticks fade/rise by 6px; leaving ticks fade/lift by 4px. Never key ticks by their pixel position or morph a numeric label into a different tick value. Initial y labels enter with 26ms stagger, x labels with 22ms stagger, coordinated to the chart reveal. Long tick collections cap total staggering at 120ms.

Axis inspection labels fade in at the initialized location and freeze/fade on exit. Masked number changes are interrupted by newer targets without queuing. Accessibility text reflects the latest logical value immediately; animated outgoing glyphs are hidden from assistive technology.

## Input beyond a mouse

- Mouse/pen hover inspects; primary click pins a sample. While pinned, movement does not silently change selection. Click another sample to move the pin; click the same one, press Escape, or tap outside to release.
- Drag horizontally across real observations to create a comparison. The selection shade, endpoint guides, and compact answer respond during the drag. After release, start and end handles snap to real observations and support pointer and keyboard adjustment; Escape cancels an edit. The answer keeps endpoint values, change and available percentage visible while focused. Plot hover does not open an inspection tooltip during comparison. Click the interval or the card's Focus interval action to focus; a separate Full range action returns while retaining the answer. The card close button clears the comparison. Escape first leaves focus, then clears the comparison. Plot text, including x-axis ticks, cannot become browser-selected during the drag. There is no mode toggle.
- The floating tooltip keeps its date and series readings when pinned. A small pin icon and `Pinned` label sit beside the date inside the tooltip, without a separate cap. Escape and clicking the selected point still release the pin; screen-reader text announces those options. The status enters and leaves over 150ms with a short vertical fade; reduced motion settles it immediately. Consumers may pass their own pin icon through `Tooltip pinIcon`.
- Touch taps pin; a horizontal drag begins comparison after an 8px intent threshold. Use `touch-action: pan-y pinch-zoom`, preserve vertical scrolling, and cancel cleanly on `pointercancel`.
- A labeled native range control lives with the plot and provides keyboard sample navigation whether or not a consumer adds `ChartReadout`. Arrow keys move samples; Home/End reach bounds; Enter marks each comparison endpoint; Escape clears the current selection. Once a keyboard comparison is committed, focus moves to its start endpoint slider and the observation control leaves the tab order. Its `aria-valuetext` contains formatted date and named values. A data-table disclosure provides the same raw observations without visual navigation.
- The interactive legend keeps a user's visibility selection while temporarily isolating a series. Restore selection returns to that set; Show all series recovers an all-hidden view. Multiple charts have independent interaction and IDs.

## Loading, refresh and update choreography

The lifecycle belongs to the chart, not each series. One chart-wide animation clock coordinates all its layers.

**Initial wait:** reserve the final dimensions immediately. Delay animated skeleton display by 120ms so fast data does not flash a placeholder. A quiet empty grid is acceptable during this short pending period; it is not an empty-data result.

**Loading:** a complete neutral skeleton occupies the final chart layout. The library owns the grid, contour, area, x/y label bars and loading status; the showcase owns optional skeletons for its summary. Use the skeleton token with a 2.5px contour at 0.50 opacity and an area gradient from 0.36 to 0.065 opacity. Axis bars are 8px high, 18–38px wide, 4px radius, 0.42 opacity, aligned to final tick gutters. Five quiet decorative grid rows remain visible. The area uses a fixed normalized 12-point contour and has no dots or numeric labels.

One broad 240px feathered sheen travels left to right on a slight diagonal in 1800ms, then rests for 300ms. It reveals light within the skeleton shapes, not an opaque rectangle moving over the chart. Summary bars and chart skeleton share phase when composed in the showcase. No independent pulses, spinner, random re-shaping, or faux percentage. Show the quiet status `Preparing chart`. Known title/period/unit metadata may remain visible; unknown dates and values must be skeletons.

Showcase summary skeleton: 150×25px total bar and 110×9px comparison bar, 15px gap, in the reserved summary dimensions. The library does not acquire a built-in KPI or card to achieve this.

**Arrival:** real geometry is prepared at its final domain before it is shown. Start a 600ms left-to-right reveal immediately while the skeleton fades over the first 240ms. Use easing `[0.22, 1, 0.36, 1]`. The real layer exists in the same frame as skeleton exit begins; opacity reaches one in 100ms. Y labels start at 32ms with the stagger above and a 240ms rise/fade. X labels start at 95ms with a 250ms rise/fade. The grid accompanies the corresponding tick positions. Summary values enter over 300ms with a 14ms per-glyph stagger capped at 84ms. No intermediate blank plot and no waiting for the skeleton loop to finish. Initial ready data uses the same choreography compressed to 420ms, with no skeleton flash.

**Refresh:** keep the last accepted data and its interactions visible at normal opacity. A small `Updating` label replaces loading chrome; no fake percentages and no skeleton over real data. New data starts an update transition. A refresh error preserves the last good chart and displays `Could not update` with the supplied explanation. Initial error gets a clear empty surface with an error message and consumer-supplied retry action.

**Data update:** when x identities and gap topology match, interpolate displayed y values and y domains together over 420ms. Paths, area boundaries, ticks, grid and active dots use the same transition progress. Existing tick values move; entering/leaving tick labels crossfade. Summary numbers use changed glyphs by default; prominent numeric summaries may opt into a 420ms visual interpolation. The accessible value and chart model always expose the latest accepted measurement. Tooltip values retain their exact 160ms bounded text transition. Different sample topology or x ranges use a bounded 240ms crossfade of two coherent geometry layers. Never morph unrelated SVG path strings or invent continuity across gaps. A newer update starts from the displayed state and cancels the previous transition.

Resize settles current geometry at the new size without replaying entrance. Theme changes repaint colors without replaying motion. Hiding the tab pauses decorative loops and settles finite transitions to their latest target. Reduced motion renders the final state immediately, including when the preference changes mid-animation.

## First example and extension order

The first example is **Daily revenue**, with deterministic 28-day fixture data in UTC, a primary filled series, and a muted dashed comparison. The total and comparison delta are computed from the fixture. Every demo says `Demo data`. No external API or user account is required.

The current repair includes the complete revenue chart and catalog variants composed from its existing line/area/gap behavior. After this passes review: add a public compact sparkline preset, controlled series visibility/legend focus, then vertical bars using the same interaction/lifecycle model. Add reference bands, linked x inspection, range selection, and streaming only in later scoped assignments. Canvas and automatic decimation remain deferred until measured need.
