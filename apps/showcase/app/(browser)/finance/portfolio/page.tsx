import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { portfolioDoc } from '@/lib/card-docs/portfolio';

export const metadata: Metadata = { title: 'Portfolio chart' };

export default function PortfolioChartPage() {
  return <CardDocPage doc={portfolioDoc} />;
}
