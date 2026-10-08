# Styling Lilt charts

Import `@lilt-ui/charts/styles.css` once. Components inherit the consumer font and use scoped `--lilt-*` CSS properties. Set palette variables on a chart wrapper or use the public `color` and series style props. The chart browser's Customize controls show supported variations and its Code tab reflects the selected settings.

Series colors drive plot marks, hover indicators, rounded-square legend swatches, and opt-in tooltip swatches. `Legend` supports custom rendering and a compact inline dot variant. Series line dashes and marker shapes do not change default legend swatches. Area treatments include solid, fade, hatch, and dots; bar treatments include solid, hatch, and dots. Use public series descriptors for treatments and per-series colors.

Check each family's integrated Preview, Code, Data, and Setup rather than copying showcase-only CSS into an application. Dark and light theme values are inherited from the host's scoped properties. Motion respects reduced-motion preferences.

## Maintaining the stylesheet

`packages/charts/src/styles.css` is the ordered import entry. The package build bundles its modules into the existing `dist/styles.css`; consumers still import `@lilt-ui/charts/styles.css`. Internal CSS paths are not package exports.

The source modules live under `packages/charts/src/styles/`:

| Responsibility                                        | Files                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Theme defaults, dark mode, and palettes               | `tokens.css`                                                                                 |
| Chart roots, SVG primitives, and plot textures        | `base.css`                                                                                   |
| Animated numbers and bounded text                     | `numbers.css`                                                                                |
| Toolbar, overview, legends, and brush                 | `toolkit.css`, `legend.css`, `brush.css`                                                     |
| Inspection, tooltips, comparisons, and annotations    | `inspection.css`, `tooltip.css`, `comparison.css`, `adaptive-readout.css`, `annotations.css` |
| Shared card structure and individual families         | `cards/base.css` and the family files under `cards/`                                         |
| Loading and global responsive or reduced-motion rules | `loading.css`, `responsive.css`                                                              |
| Finance                                               | `finance.css`                                                                                |

Keep each rule with its owner. Update its existing selector instead of appending another definition. Keep component-specific media queries and state selectors beside their base rules. Add a module when a new responsibility warrants one, and register it exactly once in the public import entry.

Every module stays inside `@layer lilt`, so consumer styles can override Lilt without increasing specificity. Import order is part of the cascade: shared styles precede family variants, loading treatments follow the families they decorate, and Finance follows the shared cards. Changing this order requires checking overlapping selectors, including equal-specificity rules; matching declaration values alone does not prove cascade equivalence.

Package-owned custom properties start with `--lilt-`. Consumer theme variables are inputs, and `--number-flow-mask-height` is the existing NumberFlow integration hook. Keep chart classes, tokens, and the public CSS import stable during organizational changes.

Run `pnpm lint:css` for CSS correctness, naming, duplicate selectors, and import coverage. It also checks the assembled package layer, so duplicates across separate files fail. The normal `pnpm lint` command includes these checks. Prettier owns formatting.

For a structural refactor, also build the package and showcase, run the existing tests and type checks, and verify an installed tarball still resolves the public stylesheet. Preserve theme, hover, loading, and reduced-motion behavior; leave final visual acceptance to the user when they have taken ownership of it.
