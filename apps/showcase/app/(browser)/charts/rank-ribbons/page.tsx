import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { rankRibbonsDoc } from '@/lib/card-docs/sculpted';

export const metadata: Metadata = { title: 'Rank ribbons' };

export default function RankRibbonsPage() {
  return <CardDocPage doc={rankRibbonsDoc} />;
}
