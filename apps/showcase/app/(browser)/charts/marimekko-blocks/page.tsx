import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { marimekkoBlocksDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Marimekko blocks' };
export default function MarimekkoBlocksPage() {
  return <CardDocPage doc={marimekkoBlocksDoc} />;
}
