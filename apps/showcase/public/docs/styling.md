# Styling Lilt charts

Import `@lilt-ui/charts/styles.css` once. Components inherit the consumer font and use scoped `--lilt-*` CSS properties. Set palette variables on a chart wrapper or use the public `color` and series style props. The chart browser's Customize controls show supported variations and its Code tab reflects the selected settings.

Series colors drive plot marks, hover indicators, rounded-square legend swatches, and opt-in tooltip swatches. `Legend` supports custom rendering and a compact inline dot variant. Series line dashes and marker shapes do not change default legend swatches. Area treatments include solid, fade, hatch, and dots; bar treatments include solid, hatch, and dots. Use public series descriptors for treatments and per-series colors.

Check each family's integrated Preview, Code, Data, and Setup rather than copying showcase-only CSS into an application. Dark and light theme values are inherited from the host's scoped properties. Motion respects reduced-motion preferences.
