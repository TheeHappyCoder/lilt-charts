import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { observationPropsFor } from './market-props';

const content: CardDocContent = {
  kind: 'cohort',
  title: 'Cohort retention',
  lede: 'How long people stay: one row per signup cohort, one column per period since, each cell the share still active.',
  heroFile: 'RetentionCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Cohort retention',
    description: '',
    kind: 'cohort',
    source: 'cohortRanges',
    props: {
      title: 'Monthly retention',
      cohort: 'cohort',
      periods: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'],
      periodLabels: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'],
      size: 'users',
    },
  }),
  usage: `<CohortRetentionCard
  title="Monthly retention"
  data={cohorts}
  cohort="cohort"
  periods={['m0', 'm1', 'm2', 'm3']}
  size="users"
/>`,
  dataShape: `// One row per cohort. Each period is the share still active, from 0 to 1;
// null is a period the cohort has not reached yet.
const cohorts = [
  { cohort: 'Feb 2026', users: 1840, m0: 1, m1: 0.46, m2: 0.4, m3: 0.34 },
  { cohort: 'Aug 2026', users: 2950, m0: 1, m1: 0.57, m2: null, m3: null },
];`,
  dataNote:
    'Later cohorts have lived through fewer periods, so their missing cells are left out and the grid steps down like a staircase. The average row weights each cohort by its size when size is given, and counts only cohorts that reached that period. Values must be shares from 0 to 1; anything else is an error rather than a misleading cell. Cohort names must be unique and keep your order.',
  hover:
    'Hover or focus a cell to read its share in the headline, with how many people that is when sizes are given. The cell’s cohort and period stay lit, like a crosshair. At rest the headline is the average for the second period, or headlinePeriod.',
  props: observationPropsFor(
    [
      { name: 'cohort', type: 'text key of Row', description: 'Each cohort’s name.' },
      {
        name: 'periods',
        type: 'numeric key of Row[]',
        description: 'One field per period since the cohort started, each a share from 0 to 1.',
      },
      {
        name: 'periodLabels',
        type: 'string[]',
        description: 'Column headings. Defaults to 0, 1, 2…',
      },
      {
        name: 'size',
        type: 'numeric key of Row',
        description: 'Starting size: shown beside the name and used to weight the average.',
      },
      {
        name: 'average',
        type: 'boolean',
        description: 'Add an average row under the cohorts. Defaults to true.',
      },
      {
        name: 'headlinePeriod',
        type: 'key of periods',
        description: 'The period whose average is the headline. Defaults to the second.',
      },
    ],
    { omit: ['aggregate'] },
  ),
  examples: [
    cardExample({
      id: 'weekly',
      title: 'Weekly, without sizes',
      description:
        'Six weekly cohorts with no sizes: the average weighs each cohort equally, and the headline reads week three.',
      kind: 'cohort',
      source: 'weeklyCohorts',
      props: {
        title: 'Weekly retention',
        cohort: 'week',
        periods: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'],
        periodLabels: ['W0', 'W1', 'W2', 'W3', 'W4', 'W5'],
        headlinePeriod: 'w3',
      },
    }),
  ],
};

export const cohortRetentionDoc = curate(content, {});
