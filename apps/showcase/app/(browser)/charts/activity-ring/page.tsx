import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { activityRingDoc } from '@/lib/card-docs/activity-ring';

export const metadata: Metadata = { title: 'Activity ring' };

export default function ActivityRingPage() {
  return <CardDocPage doc={activityRingDoc} />;
}
