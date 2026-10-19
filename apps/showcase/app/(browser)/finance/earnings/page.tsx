import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { earningsDoc } from '@/lib/card-docs/earnings';

export const metadata: Metadata = { title: 'Earnings' };

export default function EarningsPage() {
  return <CardDocPage doc={earningsDoc} />;
}
