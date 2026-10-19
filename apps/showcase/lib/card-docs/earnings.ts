import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { observationPropsFor } from './market-props';

const content: CardDocContent = {
  kind: 'earnings',
  title: 'Earnings',
  lede: 'Results against expectations: each quarter’s estimate as a ring, the result as a dot, beats green and misses red.',
  heroFile: 'EarningsCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Earnings',
    description: '',
    kind: 'earnings',
    source: 'earningsRanges',
    props: {
      title: 'Earnings per share',
      period: 'quarter',
      estimate: 'estimate',
      actual: 'actual',
    },
  }),
  usage: `<EarningsCard
  title="Earnings per share"
  data={earnings}
  period="quarter"
  estimate="estimate"
  actual="actual"
/>`,
  dataShape: `// One row per reporting period, oldest first. actual is null until it reports.
const earnings = [
  { quarter: "Q2 '26", estimate: 1.86, actual: 1.94 },
  { quarter: "Q3 '26", estimate: 1.97, actual: null },
];`,
  dataNote:
    'A result at or above its estimate is a beat; below is a miss. The surprise over each pair is the gap as a share of the estimate, measured from its size so it reads the right way for losses too. A period with no result yet keeps its ring, so the next report waits in place. Period names must be unique; they keep your order.',
  hover:
    'Hover or focus a dot or ring to read that figure in the headline, with the estimate or result it pairs with and by how much it beat or missed. At rest the headline is the latest result and the chip its surprise; the note counts beats.',
  props: observationPropsFor(
    [
      {
        name: 'period',
        type: 'text key of Row',
        description: 'Each period’s name, such as Q1 ’26.',
      },
      { name: 'estimate', type: 'numeric key of Row', description: 'Consensus estimate: a ring.' },
      {
        name: 'actual',
        type: 'numeric key of Row',
        description: 'Reported result: a dot. Null for a period still to come.',
      },
    ],
    { omit: ['color', 'aggregate'] },
  ),
  examples: [
    cardExample({
      id: 'losses',
      title: 'Narrowing losses',
      description:
        'A company still losing money: results above the estimate are beats even below zero, and the losses narrow toward the next report.',
      kind: 'earnings',
      source: 'narrowingLosses',
      props: {
        title: 'Loss per share',
        period: 'quarter',
        estimate: 'estimate',
        actual: 'actual',
      },
    }),
  ],
};

export const earningsDoc = curate(content, {});
