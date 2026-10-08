import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { spiralYearDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Spiral year' };

export default function SpiralYearPage() {
  return <CardDocPage doc={spiralYearDoc} />;
}
