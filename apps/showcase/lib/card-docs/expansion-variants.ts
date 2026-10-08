import type { CardForm } from './content';
import { cardExample, exampleJsx } from './examples';
import { observationProps } from './observation-variants';

export const streamgraphExample = cardExample({
  id: 'streamgraph',
  title: 'Channel mix',
  description:
    'A centered stream shows changing channel composition. Thickness carries the measurement; dots inspect supplied readings. Missing contributions break the whole period.',
  kind: 'streamgraph',
  source: 'channelMix',
  props: {
    title: 'Acquisition mix',
    x: 'week',
    series: [
      {
        key: 'organic',
        label: 'Organic',
      },
      {
        key: 'referral',
        label: 'Referral',
      },
      {
        key: 'paid',
        label: 'Paid',
      },
      {
        key: 'direct',
        label: 'Direct',
      },
    ],
  },
});
export const streamgraphForm: CardForm = {
  kind: 'streamgraph',
  title: 'Streamgraph',
  description:
    'A centered stream shows changing channel composition. Thickness carries the measurement; dots inspect supplied readings. Missing contributions break the whole period. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(streamgraphExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'x',
        type: 'x key of Row',
        description:
          'Unique ordered period. Strings follow input order; numeric/date positions preserve spacing.',
      },
      {
        name: 'series',
        type: 'CardSeries<Key>[]',
        description: 'Nonnegative layers.',
      },
      {
        name: 'curve',
        type: "'smooth' | 'linear'",
        description: 'Basis interpolation (default) or straight boundaries.',
      },
    ],
  ],
};

export const divergingExample = cardExample({
  id: 'diverging',
  title: 'Team sentiment',
  description:
    'Survey counts stack on either side of neutral. Neutral responses split around zero, and missing contributions leave the row incomplete rather than becoming zero.',
  kind: 'diverging',
  source: 'sentimentResponses',
  props: {
    title: 'Team sentiment',
    category: 'team',
    series: [
      {
        key: 'disagree',
        label: 'Disagree',
        side: 'negative',
      },
      {
        key: 'unsure',
        label: 'Unsure',
        side: 'neutral',
      },
      {
        key: 'agree',
        label: 'Agree',
        side: 'positive',
      },
      {
        key: 'strongly',
        label: 'Strongly agree',
        side: 'positive',
      },
    ],
    percent: true,
  },
});
export const divergingForm: CardForm = {
  kind: 'diverging',
  title: 'Diverging responses',
  description:
    'Survey counts stack on either side of neutral. Neutral responses split around zero, and missing contributions leave the row incomplete rather than becoming zero. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(divergingExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'category',
        type: 'text key of Row',
        description: 'Unique response category.',
      },
      {
        name: 'series',
        type: "{ key, label?, color?, side: 'negative' | 'neutral' | 'positive' }[]",
        description: 'Nonnegative counts with an explicit side; at most one neutral series.',
      },
      {
        name: 'percent',
        type: 'boolean',
        description: 'Normalize complete rows to 100%; readouts keep counts and percentages.',
      },
    ],
  ],
};

export const mirroredExample = cardExample({
  id: 'mirrored',
  title: 'Audience profile',
  description:
    'Two audience profiles face one another around shared category labels. Both sides use one absolute scale; left-facing bars still represent positive counts.',
  kind: 'mirrored',
  source: 'audienceAge',
  props: {
    title: 'Audience by age',
    category: 'age',
    left: 'previous',
    right: 'current',
    leftLabel: 'Previous',
    rightLabel: 'Current',
  },
});
export const mirroredForm: CardForm = {
  kind: 'mirrored',
  title: 'Mirrored bars',
  description:
    'Two audience profiles face one another around shared category labels. Both sides use one absolute scale; left-facing bars still represent positive counts. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(mirroredExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'category',
        type: 'text key of Row',
        description: 'Unique label between the two sides.',
      },
      {
        name: 'left / right',
        type: 'numeric keys of Row',
        description: 'Nonnegative measurements on one common scale.',
      },
      {
        name: 'leftLabel / rightLabel',
        type: 'string',
        description: 'Names for the two cohorts.',
      },
    ],
  ],
};

export const nesteddonutExample = cardExample({
  id: 'nesteddonut',
  title: 'Spend hierarchy',
  description:
    'Inner rings show departments; outer rings show their teams. Pinning retains a branch and its ancestors. Leaf-only paths prevent parent totals from being counted twice.',
  kind: 'nesteddonut',
  source: 'expenseHierarchy',
  props: {
    title: 'Operating spend',
    path: 'path',
    value: 'spend',
    valueFormat: {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    },
  },
});
export const nesteddonutForm: CardForm = {
  kind: 'nesteddonut',
  title: 'Nested donuts',
  description:
    'Inner rings show departments; outer rings show their teams. Pinning retains a branch and its ancestors. Leaf-only paths prevent parent totals from being counted twice. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(nesteddonutExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'path',
        type: 'text key of Row',
        description: 'Unique leaf paths separated by /; up to eight levels.',
      },
      {
        name: 'value',
        type: 'numeric key of Row',
        description: 'Nonnegative leaf area. Missing leaves contribute no known area.',
      },
      {
        name: 'hole',
        type: 'number',
        description: 'Inner hole as a fraction of radius, default 0.3.',
      },
    ],
  ],
};

export const comparativefunnelExample = cardExample({
  id: 'comparativefunnel',
  title: 'Onboarding experiment',
  description:
    'Two cohorts pass through the same stages on one absolute scale. Every stage reports its count and conversion from its own entry cohort.',
  kind: 'comparativefunnel',
  source: 'cohortConversion',
  props: {
    title: 'Onboarding conversion',
    stage: 'stage',
    cohorts: [
      {
        key: 'experiment',
        label: 'Experiment',
      },
      {
        key: 'control',
        label: 'Control',
      },
    ],
  },
});
export const comparativefunnelForm: CardForm = {
  kind: 'comparativefunnel',
  title: 'Comparative funnel',
  description:
    'Two cohorts pass through the same stages on one absolute scale. Every stage reports its count and conversion from its own entry cohort. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(comparativefunnelExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'stage',
        type: 'text key of Row',
        description: 'Unique stages in input order.',
      },
      {
        name: 'cohorts',
        type: 'readonly [CardSeries<Key>, CardSeries<Key>]',
        description:
          'Two distinct nonnegative, nonincreasing series. Missing stages remain unknown.',
      },
    ],
  ],
};

export const goalpacingExample = cardExample({
  id: 'goalpacing',
  title: 'Quarterly pace',
  description:
    'Actual revenue meets a supplied plan at an explicit cutoff. Later actual values are excluded. Expected progress interpolates only between adjacent known plan readings.',
  kind: 'goalpacing',
  source: 'quarterlyPace',
  props: {
    title: 'Quarterly revenue',
    x: 'day',
    actual: 'actual',
    expected: 'expected',
    at: 60,
    target: 100000,
    valueFormat: {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    },
  },
});
export const goalpacingForm: CardForm = {
  kind: 'goalpacing',
  title: 'Goal pacing',
  description:
    'Actual revenue meets a supplied plan at an explicit cutoff. Later actual values are excluded. Expected progress interpolates only between adjacent known plan readings. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(goalpacingExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'x',
        type: 'numeric key of Row',
        description: 'Finite, unique elapsed periods.',
      },
      {
        name: 'actual / expected',
        type: 'numeric keys of Row',
        description: 'Supplied actual and planned measurements; the chart does not forecast.',
      },
      {
        name: 'at',
        type: 'number',
        description: 'Current period, supplied explicitly.',
      },
      {
        name: 'target',
        type: 'number',
        description: 'Positive goal on the same measurement scale.',
      },
    ],
  ],
};

export const milestoneprogressExample = cardExample({
  id: 'milestoneprogress',
  title: 'Release checkpoints',
  description:
    'Named checkpoints keep their measured positions along one track. Completed, current, and upcoming states follow the supplied current value; null means unknown.',
  kind: 'milestoneprogress',
  source: 'releaseCheckpoints',
  props: {
    title: 'Release readiness',
    label: 'name',
    position: 'position',
    current: 68,
    target: 100,
  },
});
export const milestoneprogressForm: CardForm = {
  kind: 'milestoneprogress',
  title: 'Milestone progress',
  description:
    'Named checkpoints keep their measured positions along one track. Completed, current, and upcoming states follow the supplied current value; null means unknown. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(milestoneprogressExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'label',
        type: 'text key of Row',
        description: 'Unique checkpoint name.',
      },
      {
        name: 'position',
        type: 'numeric key of Row',
        description: 'Unique checkpoint position from zero through target.',
      },
      {
        name: 'current',
        type: 'number | null',
        description: 'Current progress, including values beyond the target.',
      },
      {
        name: 'target',
        type: 'number',
        description: 'Positive track endpoint, default 100.',
      },
    ],
  ],
};

export const violinExample = cardExample({
  id: 'violin',
  title: 'Delivery distributions',
  description:
    'A density silhouette reveals each delivery distribution, with measured sample dots and a median readout. Deterministic horizontal offsets separate samples without changing their values.',
  kind: 'violin',
  source: 'deliverySamples',
  props: {
    title: 'Delivery time',
    category: 'carrier',
    value: 'hours',
    label: 'parcel',
    valueFormat: {
      style: 'unit',
      unit: 'hour',
      maximumFractionDigits: 1,
    },
  },
});
export const violinForm: CardForm = {
  kind: 'violin',
  title: 'Violin plot',
  description:
    'A density silhouette reveals each delivery distribution, with measured sample dots and a median readout. Deterministic horizontal offsets separate samples without changing their values. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(violinExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'category',
        type: 'text key of Row',
        description: 'Category for each sample.',
      },
      {
        name: 'value',
        type: 'numeric key of Row',
        description: 'Measured sample; missing samples remain in the table.',
      },
      {
        name: 'label',
        type: 'text key of Row',
        description: 'Optional sample name.',
      },
      {
        name: 'points',
        type: 'boolean',
        description: 'Show every sample, default true.',
      },
      {
        name: 'bandwidth',
        type: 'number',
        description: 'Positive kernel bandwidth in measurement units; data-derived when omitted.',
      },
      {
        name: 'scale',
        type: "'width' | 'density'",
        description: 'Equal maximum widths (default) or a common density scale.',
      },
    ],
  ],
};

export const correlationExample = cardExample({
  id: 'correlation',
  title: 'Campaign relationships',
  description:
    'A symmetric Pearson matrix compares each metric with every other metric. Inspection retains both rows and columns and reports the number of complete pairs. Constant values are undefined, not zero correlation.',
  kind: 'correlation',
  source: 'campaignMetrics',
  props: {
    title: 'Campaign relationships',
    metrics: [
      {
        key: 'spend',
        label: 'Spend',
      },
      {
        key: 'visits',
        label: 'Visits',
      },
      {
        key: 'orders',
        label: 'Orders',
      },
      {
        key: 'churn',
        label: 'Churn',
      },
      {
        key: 'latency',
        label: 'Latency',
      },
    ],
  },
});
export const correlationForm: CardForm = {
  kind: 'correlation',
  title: 'Correlation matrix',
  description:
    'A symmetric Pearson matrix compares each metric with every other metric. Inspection retains both rows and columns and reports the number of complete pairs. Constant values are undefined, not zero correlation. All three loading styles share the skeleton exit, entrance, pointer/keyboard pinning, touch glide, reduced motion, and accessible readings table. Aggregate marks report null as their original datum.',
  usage: exampleJsx(correlationExample),
  props: [
    ...observationProps,
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Legend layout; false hides it. Correlation defaults to false.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker, square by default.',
    },
    ...[
      {
        name: 'metrics',
        type: 'CardSeries<Key>[]',
        description: 'At least two distinct numeric metrics.',
      },
      {
        name: 'minPairs',
        type: 'number',
        description: 'Minimum complete pairs for a coefficient, default 3.',
      },
    ],
  ],
};

export const indexedgrowthExample = cardExample({
  id: 'indexedgrowth',
  title: 'Indexed growth',
  source: 'indexedGrowth',
  props: {
    title: 'Subscription growth',
    x: 'month',
    series: [
      {
        key: 'subscribers',
        label: 'Subscribers',
      },
      {
        key: 'revenue',
        label: 'Revenue',
      },
    ],
    indexed: true,
  },
  description:
    'Series with different units start at 100 at their first finite observation. A zero baseline cannot be indexed and stays missing. The headline follows the latest value of the first series.',
  kind: 'line',
});
export const forecastfanExample = cardExample({
  id: 'forecastfan',
  title: 'Forecast fan',
  source: 'forecastEnvelopes',
  props: {
    hover: 'tooltip',
    title: 'Revenue outlook',
    x: 'month',
    series: [
      {
        key: 'revenue',
        label: 'Revenue',
      },
    ],
    forecast: {
      from: 'M8',
      bands: [
        {
          lower: 'low95',
          upper: 'high95',
          label: '95% interval',
        },
        {
          lower: 'low80',
          upper: 'high80',
          label: '80% interval',
        },
      ],
    },
  },
  description:
    'Two supplied forecast envelopes show widening uncertainty. Hovering exposes every interval bound. The headline summarizes observed readings, and the chart never estimates a forecast.',
  kind: 'line',
});
export const areaForecastFanExample = cardExample({
  id: 'forecastfan',
  title: 'Forecast fan',
  description: forecastfanExample.description,
  kind: 'area',
  source: 'forecastEnvelopes',
  props: {
    title: 'Revenue outlook',
    x: 'month',
    series: [{ key: 'revenue', label: 'Revenue' }],
    hover: 'tooltip',
    forecast: {
      from: 'M8',
      bands: [
        { lower: 'low95', upper: 'high95', label: '95% interval' },
        { lower: 'low80', upper: 'high80', label: '80% interval' },
      ],
    },
  },
});
export const scattertrailsExample = cardExample({
  id: 'scattertrails',
  title: 'Market trajectories',
  source: 'marketTrails',
  props: {
    title: 'Market trajectories',
    x: 'reach',
    y: 'retention',
    group: 'market',
    label: 'reading',
    trails: true,
    trailOrder: 'quarter',
    xLabel: 'Reach',
    yLabel: 'Retention',
    aggregate: 'mean',
  },
  description:
    'Each market moves through seven quarters. Trails follow explicit time order, break at missing positions, and retain their whole group while an observation is pinned.',
  kind: 'scatter',
});
