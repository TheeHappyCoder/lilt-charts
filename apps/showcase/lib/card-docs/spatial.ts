import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { observationProps } from './observation-variants';
import * as spatialData from './spatial-data';

export const sunburstTerracesDoc = curate(
  {
    kind: 'sunburstterraces',
    title: 'Sunburst terraces',
    lede: 'A hierarchy steps outward through circular terraces; each branch owns its share of the ring.',
    heroFile: 'SunburstTerracesExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Sunburst terraces',
      description: '',
      kind: 'sunburstterraces',
      source: 'spatialHierarchy',
      props: { title: 'Sunburst terraces', path: 'path', value: 'value' },
    }),
    usage: '<SunburstTerracesCard data={spatialHierarchy} path="path" value="value" />',
    dataShape:
      'const spatialHierarchy = ' + JSON.stringify(spatialData.spatialHierarchy, null, 2) + ';',
    dataNote:
      'Supply leaf-only slash-separated paths, up to eight levels. Branch angles sum known leaf values; missing leaves do not invent area. Zero and missing readings remain in the data table. A path cannot also be an ancestor. Branch selection returns a null datum with a calculated total; leaves return their original row. Terrace height is decorative.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 360px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'path',
          type: 'text key of Row',
          description:
            'Unique leaf path. Separate hierarchy levels with /; do not supply parent-total rows.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'tilt',
          type: 'number',
          description:
            'Vertical proportion of the projected plane, from 0.4 to 1 (Wind rose: 0.45 to 1). Default 0.62.',
        },
        {
          name: 'rise',
          type: 'number',
          description:
            'Decorative terrace step (0–24px), or Ternary magnitude height (0–80px). Default 12.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'sunburstterraces',
        source: 'hierarchyWithGaps',
        props: { title: 'Incomplete observations', path: 'path', value: 'value' },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const clusterConstellationDoc = curate(
  {
    kind: 'clusterconstellation',
    title: 'Cluster constellation',
    lede: 'A spatial network of shaded nodes and curved links, with the inspected node’s neighbours kept in view.',
    heroFile: 'ClusterConstellationExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Cluster constellation',
      description: '',
      kind: 'clusterconstellation',
      source: 'spatialCloud',
      props: {
        title: 'Cluster constellation',
        label: 'name',
        x: 'x',
        y: 'y',
        z: 'z',
        value: 'value',
        connections: 'links',
        group: 'group',
      },
    }),
    usage:
      '<ClusterConstellationCard data={spatialCloud} label="name" x="x" y="y" z="z" value="value" connections="links" group="group" />',
    dataShape: 'const spatialCloud = ' + JSON.stringify(spatialData.spatialCloud, null, 2) + ';',
    dataNote:
      'Supply unique labels, finite XYZ coordinates and arrays of neighbouring labels. Links are undirected and deduplicated; self-links and unknown endpoints are rejected. Positions come from your data rather than a random force simulation. Node area carries magnitude. Missing positions stay in the table. The headline counts located nodes.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 360px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'label',
          type: 'text key of Row',
          description:
            'Unique nonempty observation label, retained through inspection and pinning.',
        },
        {
          name: 'x',
          type: 'numeric key of Row',
          description: 'First spatial coordinate on an independent linear scale.',
        },
        {
          name: 'y',
          type: 'numeric key of Row',
          description: 'Second spatial coordinate on an independent linear scale.',
        },
        {
          name: 'z',
          type: 'numeric key of Row',
          description: 'Third spatial coordinate on an independent linear scale.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'connections',
          type: 'array-of-text key of Row',
          description:
            'Array of existing node labels. Connections are undirected; duplicates and self-links are rejected.',
        },
        { name: 'group', type: 'text key of Row', description: 'Optional categorical color key.' },
        {
          name: 'yaw',
          type: 'number',
          description:
            'Camera rotation around the vertical axis, in degrees from -180 to 180. Default 35.',
        },
        {
          name: 'elevation',
          type: 'number',
          description: 'Camera elevation, 10 to 70 degrees. Default 25.',
        },
        {
          name: 'size',
          type: 'number',
          description:
            'Maximum cube half-edge or sphere size as a fraction of the normalized plot, 0.025 to 0.18. Default 0.09.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'clusterconstellation',
        source: 'cloudWithGaps',
        props: {
          title: 'Incomplete observations',
          label: 'name',
          x: 'x',
          y: 'y',
          z: 'z',
          value: 'value',
          connections: 'links',
          group: 'group',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const ternaryPrismDoc = curate(
  {
    kind: 'ternaryprism',
    title: 'Ternary prism',
    lede: 'Three competing ingredients find a position on a triangular floor, while magnitude rises above it.',
    heroFile: 'TernaryPrismExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Ternary prism',
      description: '',
      kind: 'ternaryprism',
      source: 'ternaryMix',
      props: { title: 'Ternary prism', label: 'name', a: 'a', b: 'b', c: 'c', value: 'value' },
    }),
    usage: '<TernaryPrismCard data={ternaryMix} label="name" a="a" b="b" c="c" value="value" />',
    dataShape: 'const ternaryMix = ' + JSON.stringify(spatialData.ternaryMix, null, 2) + ';',
    dataNote:
      'Three distinct nonnegative measurements are normalized to shares; their original units must be comparable. The floor position encodes the shares, and column height encodes value. A missing part or all-zero composition has no position. The resting headline counts located compositions.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 340px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'label',
          type: 'text key of Row',
          description:
            'Unique nonempty observation label, retained through inspection and pinning.',
        },
        {
          name: 'a',
          type: 'numeric key of Row',
          description: 'First nonnegative composition measurement.',
        },
        {
          name: 'b',
          type: 'numeric key of Row',
          description: 'Second nonnegative composition measurement.',
        },
        {
          name: 'c',
          type: 'numeric key of Row',
          description: 'Third nonnegative composition measurement.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'tilt',
          type: 'number',
          description:
            'Vertical proportion of the projected plane, from 0.4 to 1 (Wind rose: 0.45 to 1). Default 0.65.',
        },
        {
          name: 'rise',
          type: 'number',
          description:
            'Decorative terrace step (0–24px), or Ternary magnitude height (0–80px). Default 38.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'ternaryprism',
        source: 'compositionWithGaps',
        props: {
          title: 'Incomplete observations',
          label: 'name',
          a: 'a',
          b: 'b',
          c: 'c',
          value: 'value',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const windRoseDoc = curate(
  {
    kind: 'windrose',
    title: 'Wind rose',
    lede: 'Compass petals divide a directional distribution into stacked magnitude bands.',
    heroFile: 'WindRoseExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Wind rose',
      description: '',
      kind: 'windrose',
      source: 'compassBands',
      props: { title: 'Wind rose', direction: 'direction', band: 'band', value: 'value' },
    }),
    usage: '<WindRoseCard data={compassBands} direction="direction" band="band" value="value" />',
    dataShape: 'const compassBands = ' + JSON.stringify(spatialData.compassBands, null, 2) + ';',
    dataNote:
      'Pre-bin observations into equal sectors. Direction is the centre angle, north at 0°, clockwise, and must be a multiple of 360 / sectors. One row per direction and band. Petal area is proportional to frequency, so radius follows the square root of cumulative frequency. Missing and zero values retain distinct table entries.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 340px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'direction',
          type: 'numeric key of Row',
          description: 'Compass sector centre in degrees, north at 0 and clockwise.',
        },
        {
          name: 'band',
          type: 'text key of Row',
          description: 'Magnitude-band label; stacking follows first-seen order.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'sectors',
          type: 'number',
          description:
            'Number of equal compass sectors, 4 to 16. Supply matching pre-binned centre angles. Default 8.',
        },
        {
          name: 'tilt',
          type: 'number',
          description:
            'Vertical proportion of the projected plane, from 0.4 to 1 (Wind rose: 0.45 to 1). Default 0.76.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'windrose',
        source: 'windWithGaps',
        props: {
          title: 'Incomplete observations',
          direction: 'direction',
          band: 'band',
          value: 'value',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const marimekkoBlocksDoc = curate(
  {
    kind: 'marimekkoblocks',
    title: 'Marimekko blocks',
    lede: 'A segmented floor of equal-depth slabs makes category size and composition visible together.',
    heroFile: 'MarimekkoBlocksExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Marimekko blocks',
      description: '',
      kind: 'marimekkoblocks',
      source: 'marketComposition',
      props: {
        title: 'Marimekko blocks',
        category: 'category',
        segment: 'segment',
        value: 'value',
      },
    }),
    usage:
      '<MarimekkoBlocksCard data={marketComposition} category="category" segment="segment" value="value" />',
    dataShape:
      'const marketComposition = ' + JSON.stringify(spatialData.marketComposition, null, 2) + ';',
    dataNote:
      'One row per category and segment with nonnegative value. Column widths reflect known category totals; subdivisions reflect their shares. All top areas use the same scale and every slab has equal depth. Gaps sit between columns. Missing values are excluded from the known total, retained in the table and never interpreted as zero.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 340px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'category',
          type: 'text key of Row',
          description: 'Category whose total determines column width.',
        },
        {
          name: 'segment',
          type: 'text key of Row',
          description: 'Composition segment and legend identity.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'gap',
          type: 'number',
          description: 'Space between category columns in floor units, 0 to 0.2. Default 0.06.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'marimekkoblocks',
        source: 'marketWithGaps',
        props: {
          title: 'Incomplete observations',
          category: 'category',
          segment: 'segment',
          value: 'value',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const intersectionTowersDoc = curate(
  {
    kind: 'intersectiontowers',
    title: 'Intersection towers',
    lede: 'Exclusive set overlaps rise as towers above the membership dots that define them.',
    heroFile: 'IntersectionTowersExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Intersection towers',
      description: '',
      kind: 'intersectiontowers',
      source: 'audienceIntersections',
      props: { title: 'Intersection towers', members: 'sets', value: 'value' },
    }),
    usage: '<IntersectionTowersCard data={audienceIntersections} members="sets" value="value" />',
    dataShape:
      'const audienceIntersections = ' +
      JSON.stringify(spatialData.audienceIntersections, null, 2) +
      ';',
    dataNote:
      'Each row is an exclusive intersection: it belongs to exactly the listed sets and no others. Supply a nonempty array of distinct set names and a nonnegative size. Set order inside a row does not change identity; duplicate intersections are rejected. Missing sizes remain outlined, and sorting puts them after known values.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 340px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'members',
          type: 'array-of-text key of Row',
          description: 'Nonempty array of distinct set names defining one exclusive intersection.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'sort',
          type: "'value' | 'input'",
          description: 'Sort by descending size (default) or keep input order. Default value.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'intersectiontowers',
        source: 'intersectionWithGaps',
        props: { title: 'Incomplete observations', members: 'sets', value: 'value' },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const horizonFoldsDoc = curate(
  {
    kind: 'horizonfolds',
    title: 'Horizon folds',
    lede: 'Signed time series fold into compact bands so many patterns can be read on the same scale.',
    heroFile: 'HorizonFoldsExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Horizon folds',
      description: '',
      kind: 'horizonfolds',
      source: 'serviceHorizons',
      props: { title: 'Horizon folds', series: 'series', time: 'time', value: 'value' },
    }),
    usage: '<HorizonFoldsCard data={serviceHorizons} series="series" time="time" value="value" />',
    dataShape:
      'const serviceHorizons = ' + JSON.stringify(spatialData.serviceHorizons, null, 2) + ';',
    dataNote:
      'One row per series and numeric time. Samples sort by time within each series. All series share one absolute magnitude scale. Positive values use the first palette color and negative values use the fourth; deeper color represents higher bands. Missing samples break the shape. Inspection reports the original signed value, and the resting headline is the mean of known values.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 330px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'series',
          type: 'text key of Row',
          description: 'Series label; each series retains one track.',
        },
        {
          name: 'time',
          type: 'numeric key of Row',
          description: 'Finite numeric time. Samples are sorted within each series.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Signed numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'bands',
          type: 'number',
          description: 'Number of folded magnitude bands, 2 to 5. Default 3.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'horizonfolds',
        source: 'horizonsWithGaps',
        props: { title: 'Incomplete observations', series: 'series', time: 'time', value: 'value' },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const circleArchipelagoDoc = curate(
  {
    kind: 'circlearchipelago',
    title: 'Circle archipelago',
    lede: 'Nested islands of circles reveal a hierarchy while leaf areas keep a common value scale.',
    heroFile: 'CircleArchipelagoExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Circle archipelago',
      description: '',
      kind: 'circlearchipelago',
      source: 'spatialHierarchy',
      props: { title: 'Circle archipelago', path: 'path', value: 'value' },
    }),
    usage: '<CircleArchipelagoCard data={spatialHierarchy} path="path" value="value" />',
    dataShape:
      'const spatialHierarchy = ' + JSON.stringify(spatialData.spatialHierarchy, null, 2) + ';',
    dataNote:
      'Use unique leaf-only slash-separated paths and nonnegative values. Every leaf radius uses the square root of its value with one common scale, even across branches. Enclosing circles are grouping boundaries, not total-value bubbles. Missing and zero leaves have no invented area. Deterministic packing keeps siblings separate.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 380px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'path',
          type: 'text key of Row',
          description:
            'Unique leaf path. Separate hierarchy levels with /; do not supply parent-total rows.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'padding',
          type: 'number',
          description: 'Circle packing gap in square-root value units, 0 to 3. Default 0.7.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'circlearchipelago',
        source: 'hierarchyWithGaps',
        props: { title: 'Incomplete observations', path: 'path', value: 'value' },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const helixRibbonsDoc = curate(
  {
    kind: 'helixribbons',
    title: 'Helix ribbons',
    lede: 'Recurring signals wind upward as ribbons, aligning the same phase across successive cycles.',
    heroFile: 'HelixRibbonsExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Helix ribbons',
      description: '',
      kind: 'helixribbons',
      source: 'cyclicRibbons',
      props: {
        title: 'Helix ribbons',
        series: 'series',
        cycle: 'cycle',
        phase: 'phase',
        value: 'value',
      },
    }),
    usage:
      '<HelixRibbonsCard data={cyclicRibbons} series="series" cycle="cycle" phase="phase" value="value" />',
    dataShape: 'const cyclicRibbons = ' + JSON.stringify(spatialData.cyclicRibbons, null, 2) + ';',
    dataNote:
      'Supply an integer cycle and a phase from 0 inclusive to 1 exclusive, with nonnegative magnitude. Cycles must span at most 25 consecutive turns. Width interpolates between known samples; null values or gaps larger than maxGap break the ribbon. Concentric lanes separate series without shifting their measured phase. Beads preserve individual samples.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 390px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'series',
          type: 'text key of Row',
          description: 'Series label; each series retains one track.',
        },
        {
          name: 'cycle',
          type: 'numeric key of Row',
          description: 'Safe integer cycle number. A view spans at most 25 consecutive turns.',
        },
        {
          name: 'phase',
          type: 'numeric key of Row',
          description: 'Fraction of a cycle, from 0 inclusive to 1 exclusive.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        {
          name: 'yaw',
          type: 'number',
          description:
            'Camera rotation around the vertical axis, in degrees from -180 to 180. Default 25.',
        },
        {
          name: 'elevation',
          type: 'number',
          description: 'Camera elevation, 10 to 70 degrees. Default 20.',
        },
        {
          name: 'thickness',
          type: 'number',
          description: 'Maximum ribbon width, 3 to 26 pixels. Default 13.',
        },
        {
          name: 'maxGap',
          type: 'number',
          description: 'Largest gap between samples, measured in cycles, 0.05 to 1. Default 0.3.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'helixribbons',
        source: 'ribbonsWithGaps',
        props: {
          title: 'Incomplete observations',
          series: 'series',
          cycle: 'cycle',
          phase: 'phase',
          value: 'value',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const voxelCloudDoc = curate(
  {
    kind: 'voxelcloud',
    title: 'Voxel cloud',
    lede: 'A genuine XYZ scatter of lit cubes, with camera rotation and slices through the original z values.',
    heroFile: 'VoxelCloudExample.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Voxel cloud',
      description: '',
      kind: 'voxelcloud',
      source: 'spatialCloud',
      props: {
        title: 'Voxel cloud',
        label: 'name',
        x: 'x',
        y: 'y',
        z: 'z',
        value: 'value',
        group: 'group',
      },
    }),
    usage:
      '<VoxelCloudCard data={spatialCloud} label="name" x="x" y="y" z="z" value="value" group="group" />',
    dataShape: 'const spatialCloud = ' + JSON.stringify(spatialData.spatialCloud, null, 2) + ';',
    dataNote:
      'Supply unique labels, XYZ coordinates and nonnegative magnitude. Each coordinate has an independent linear scale and equal-valued axes are centred. Positive cube volume carries magnitude; zero and missing magnitudes use small distinct inspection markers. Slice bounds are inclusive in original z units and do not rescale the camera. All rows remain in the table, including missing and sliced-out positions. The headline counts visible positioned observations.',
    hover:
      'Shaped shimmer, staggered draw and breathe placeholders share the existing opacity exit before the entrance reveal. Refreshes retain accepted data. Hover or focus reads the original observation; click or Enter pins it, and Escape releases. Arrow keys, Home and End move between marks; touch dragging inspects and lifting pins. Reduced motion skips decorative animation while preserving inspection feedback.',
    props: [
      ...observationProps
        .filter((row) => row.name !== 'aggregate')
        .map((row) =>
          row.name === 'height'
            ? {
                ...row,
                description:
                  'Minimum plot height, default 360px. Dense data may expand within the scrollable viewport.',
              }
            : row,
        ),
      ...[
        {
          name: 'label',
          type: 'text key of Row',
          description:
            'Unique nonempty observation label, retained through inspection and pinning.',
        },
        {
          name: 'x',
          type: 'numeric key of Row',
          description: 'First spatial coordinate on an independent linear scale.',
        },
        {
          name: 'y',
          type: 'numeric key of Row',
          description: 'Second spatial coordinate on an independent linear scale.',
        },
        {
          name: 'z',
          type: 'numeric key of Row',
          description: 'Third spatial coordinate on an independent linear scale.',
        },
        {
          name: 'value',
          type: 'numeric key of Row',
          description: 'Nonnegative numeric measurement. Null or undefined is missing.',
        },
        { name: 'group', type: 'text key of Row', description: 'Optional categorical color key.' },
        {
          name: 'yaw',
          type: 'number',
          description:
            'Camera rotation around the vertical axis, in degrees from -180 to 180. Default 35.',
        },
        {
          name: 'elevation',
          type: 'number',
          description: 'Camera elevation, 10 to 70 degrees. Default 25.',
        },
        {
          name: 'size',
          type: 'number',
          description:
            'Maximum cube half-edge or sphere size as a fraction of the normalized plot, 0.025 to 0.18. Default 0.09.',
        },
        {
          name: 'slice',
          type: 'readonly [number, number]',
          description:
            'Optional inclusive [min, max] filter in original z units. The camera domain remains fixed.',
        },
      ],
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete observations',
        description:
          'Missing readings remain missing while the known observations retain their geometry.',
        kind: 'voxelcloud',
        source: 'cloudWithGaps',
        props: {
          title: 'Incomplete observations',
          label: 'name',
          x: 'x',
          y: 'y',
          z: 'z',
          value: 'value',
          group: 'group',
        },
      }),
      cardExample({
        id: 'slice',
        title: 'The middle layer',
        description:
          'A slice through z = 35 to 65 preserves the full coordinate domain while exposing the middle of the cloud.',
        kind: 'voxelcloud',
        source: 'spatialCloud',
        props: {
          title: 'The middle layer',
          label: 'name',
          x: 'x',
          y: 'y',
          z: 'z',
          value: 'value',
          group: 'group',
          slice: [35, 65],
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);
