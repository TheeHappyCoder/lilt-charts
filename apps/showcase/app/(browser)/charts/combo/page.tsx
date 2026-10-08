import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { comboDoc } from '@/lib/card-docs/combo';

export const metadata: Metadata = { title: 'Combo chart' };

export default function ComboChartPage() {
  return <CardDocPage doc={comboDoc} />;
}
