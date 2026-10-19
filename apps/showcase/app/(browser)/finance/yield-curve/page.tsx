import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { yieldCurveDoc } from '@/lib/card-docs/yield-curve';

export const metadata: Metadata = { title: 'Yield curve' };

export default function YieldCurvePage() {
  return <CardDocPage doc={yieldCurveDoc} />;
}
