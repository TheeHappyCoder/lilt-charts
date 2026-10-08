import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { statDoc } from '@/lib/card-docs/stat';

export const metadata: Metadata = { title: 'Stat cards' };

export default function StatCardsPage() {
  return <CardDocPage doc={statDoc} />;
}
