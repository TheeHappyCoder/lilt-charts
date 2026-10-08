import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { orderBookDoc } from '@/lib/card-docs/order-book';

export const metadata: Metadata = { title: 'Order book' };

export default function OrderBookPage() {
  return <CardDocPage doc={orderBookDoc} />;
}
