# Motion

How every Lilt chart family moves. Each family's motion lives with its mark code; shared physics live in
`packages/charts/src/motion`.

## The rule

Only motion a real chart does: changing the period, sorting and re-ranking, showing or hiding a
series, data arriving and leaving, the first reveal. Marks behave as physical objects. No
decoration on a still chart, no chart-type morphs, no streaming showpieces.

## The language

| Moment         | Motion                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Arrive         | Rise or grow out of nothing on the spring (slight overshoot) while an 8px blur clears; arrivals ripple 30ms apart, capped. |
| Leave          | Drain or collapse with a 3px blur; neighbours start closing the gap partway through (0.14s).                               |
| Stay           | Spring to the new place, size and value.                                                                                   |
| Rearrange      | A light 1.5px motion-blur pulse over the marks; rows that change rank blur up to 3px while they travel.                    |
| Values         | Changed digits blur-roll; labels blur-swap.                                                                                |
| First reveal   | The same as Arrive, so loading a page and changing period feel like one motion.                                            |
| Reduced motion | Instant. Never paint the end state before a transition starts.                                                             |

## Families

Dense column marks (range bars, box plots, candles) are drawn as a few batched paths so thousands of
observations stay fast; they move with the time axis rather than per-column snaps.

| Family                           | Real behaviour               | Motion                                                                                  | Status |
| -------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- | ------ |
| Bar, stacked bar                 | period change, first reveal  | snap: arrive, leave, stay; pulse                                                        | Done   |
| Line, area                       | period change, series toggle | keyed morph; y scale glides in one layer                                                | Done   |
| Line, area                       | data arriving                | the period morph grows new data out of the last point, drawing the line forward         | Done   |
| Horizontal bar                   | values change, re-rank       | rows blur while travelling; bars spring; arrivals and departures blur                   | Done   |
| Funnel, Progress                 | period change                | stages and fills drain and refill on the spring                                         | Done   |
| Radial, Activity ring, Stat ring | period change                | arcs sweep on the spring; leaving slices collapse; new ones grow                        | Done   |
| Scatter, Strip, Slope, Radar     | period change                | points travel; arrivals pop in from a blur; departures shrink away                      | Done   |
| Heatmap, Calendar                | period change                | cells re-colour in a diagonal ripple                                                    | Done   |
| Treemap, Timeline, Strip         | values change                | tiles spring to their new rectangles; arrivals blur in                                  | Done   |
| Sankey                           | period change                | ribbons and nodes spring to their new thickness                                         | Done   |
| Range, Box plot                  | period change                | batched column marks slide with the time axis (keyed morph) under the motion-blur pulse | Done   |
| Combo, finance                   | period change, arrivals      | keyed morph and pulse through the chart engine; live charts never pulse                 | Done   |
