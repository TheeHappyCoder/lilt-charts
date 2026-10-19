import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { cohortRetentionDoc } from '@/lib/card-docs/cohort-retention';

export const metadata: Metadata = { title: 'Cohort retention' };

export default function CohortRetentionPage() {
  return <CardDocPage doc={cohortRetentionDoc} />;
}
