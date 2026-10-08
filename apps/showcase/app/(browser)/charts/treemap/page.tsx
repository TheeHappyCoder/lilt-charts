import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { treemapDoc } from '@/lib/card-docs/treemap';

export const metadata: Metadata = { title: 'Treemap' };

export default function TreemapPage() {
  return <CardDocPage doc={treemapDoc} />;
}
