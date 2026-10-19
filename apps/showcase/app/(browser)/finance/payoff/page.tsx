import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { payoffDoc } from '@/lib/card-docs/payoff';

export const metadata: Metadata = { title: 'Options payoff' };

export default function PayoffPage() {
  return <CardDocPage doc={payoffDoc} />;
}
