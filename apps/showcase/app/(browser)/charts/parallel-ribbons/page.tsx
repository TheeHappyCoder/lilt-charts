import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { parallelRibbonsDoc } from '@/lib/card-docs/sculpted';

export const metadata: Metadata = { title: 'Parallel ribbons' };

export default function ParallelRibbonsPage() {
  return <CardDocPage doc={parallelRibbonsDoc} />;
}
