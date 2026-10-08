# Spatial Cool review — 7 October 2026

Ten new chart families are integrated into the package and the showcase's Cool group.

| Family                | Encoding and controls                                                                                                                               | Preview                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Sunburst terraces     | Leaf totals determine branch angles; hierarchy determines rings. Tilt and terrace rise.                                                             | [Open](http://localhost:5173/charts/sunburst-terraces)     |
| Cluster constellation | Supplied XYZ positions, magnitude spheres, undirected links, neighbour inspection. Yaw, elevation, size.                                            | [Open](http://localhost:5173/charts/cluster-constellation) |
| Ternary prism         | Normalized three-part composition on a triangular floor; magnitude determines height. Tilt and rise.                                                | [Open](http://localhost:5173/charts/ternary-prism)         |
| Wind rose             | Equal-angle sectors with frequency-proportional petal areas and stacked bands. Sector count and tilt.                                               | [Open](http://localhost:5173/charts/wind-rose)             |
| Marimekko blocks      | Category totals determine widths; segment values determine top areas. Equal-depth slabs and column gaps.                                            | [Open](http://localhost:5173/charts/marimekko-blocks)      |
| Intersection towers   | Exclusive set-intersection sizes above their membership matrix. Input or descending-value order.                                                    | [Open](http://localhost:5173/charts/intersection-towers)   |
| Horizon folds         | Signed time series on one magnitude scale, folded into two to five color bands.                                                                     | [Open](http://localhost:5173/charts/horizon-folds)         |
| Circle archipelago    | Leaf circles share one area/value scale; nested enclosing circles identify ancestry. Packing gap.                                                   | [Open](http://localhost:5173/charts/circle-archipelago)    |
| Helix ribbons         | Phase determines angle, cycles determine height, magnitude determines width. Concentric series lanes, camera controls, thickness and gap threshold. | [Open](http://localhost:5173/charts/helix-ribbons)         |
| Voxel cloud           | Independent XYZ scales, magnitude cubes, original-unit z slices. Yaw, elevation, size and inclusive slice bounds.                                   | [Open](http://localhost:5173/charts/voxel-cloud)           |

## Implementation

- Ten typed card modules in `packages/charts/src/cards/*-card.tsx`, exported through `packages/charts/src/index.ts`.
- Geometry in `spatial-geometry.ts`, `spatial-hierarchy.ts`, `hierarchy-layouts.ts`, `spatial-point-layouts.ts`, `spatial-composition-layouts.ts`, and `spatial-series-layouts.ts`.
- The existing observation shell owns shimmer/draw/breathe, the skeleton opacity exit, entrance animations, refresh retention, hover, pinning, keyboard navigation, touch inspection, and reduced motion. New related-node highlighting extends that state; supplemental descriptions retain spoken numeric values.
- Showcase pages, navigation, Props controls, loading lab, generated source, agent-readable documentation and consumer type probes are integrated. `apps/showcase/lib/card-docs/spatial.ts` and `spatial-data.ts` hold the documentation and the exact data used by the generated examples.
- `spatial-cards.test.tsx` adds 85 tests covering lifecycle, interactions, hierarchy totals, circle packing, area ratios, camera/slice stability, missing data, signed crossings, gap behavior, accessibility and deterministic server rendering.

## Review evidence

All ten pages were inspected in the in-app browser at desktop width and a 390 × 844 mobile viewport. No page-level horizontal overflow or browser console errors were observed. Dense plots retain their internal scrolling. The viewport override was reset.

Browser interaction checks verified constellation Enter-to-pin and Escape-to-release, preservation of four neighbours while 25 other nodes muted, Helix yaw changes through Props, and the Voxel middle-layer example (16 visible nodes from 30, with unchanged coordinate domains). Shimmer, Draw and Breathe were exercised during held loading; the global Loading setting was restored to Auto and held loading was released.

Visual review prompted separated concentric Helix lanes, clustered network demo coordinates, and a lighter Ternary floor. A regression test now ensures spatial descriptions supplement numeric values in accessible button names and table cells.

The final suite exposed an existing rapid-number-update failure. The test could select an outgoing glyph by DOM order, and a returning glyph could resume from an opacity below the live-reading minimum. `animated-number.tsx` now separates the animated opacity from the displayed opacity, preserving a 0.35 floor only for the current live glyph while allowing exits to fade fully. The test identifies the current glyph through presence state. All 12 number tests pass; browser Slide inspection also showed legible current digits with no console errors. The Numbers setting was restored to Auto.

Final validation: **887 package tests across 88 files passed**, along with **108 showcase tests**. The production build generated **148 static pages**. Package and showcase TypeScript, built-package consumer checks, lint, CSS contracts, formatting and the scoped whitespace check passed. The focused observation-family regression run also passed all 202 tests.

## Practical limits

The depth geometry uses orthographic SVG/CSS projection, with camera settings controlled through props; it is not a WebGL scene or a free-drag orbit control. Overlapping observations remain available to keyboard inspection. Constellation positions are supplied by consumers, not computed by a force simulation. Sunburst accepts up to eight hierarchy levels, and Helix ribbons spans at most 25 consecutive cycles. Circle enclosures show grouping; only leaf areas encode values. Horizon folds is a compact signed-series view rather than a 3D scene.

Existing chart work and unrelated video edits were preserved. Nothing was published or deployed. The repository-wide whitespace check reports a pre-existing blank line at the end of `video/src/films/looks.css`; the changed chart, showcase and product-document paths pass their scoped check.
