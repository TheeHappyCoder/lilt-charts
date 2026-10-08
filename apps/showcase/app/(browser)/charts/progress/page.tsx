import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { progressDoc } from '@/lib/card-docs/progress';

export const metadata: Metadata = { title: 'Progress' };

export default function ProgressPage() {
  return <CardDocPage doc={progressDoc} />;
}
