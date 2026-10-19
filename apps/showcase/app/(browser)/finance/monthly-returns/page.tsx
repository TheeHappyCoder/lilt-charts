import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { monthlyReturnsDoc } from '@/lib/card-docs/monthly-returns';

export const metadata: Metadata = { title: 'Monthly returns' };

export default function MonthlyReturnsPage() {
  return <CardDocPage doc={monthlyReturnsDoc} />;
}
