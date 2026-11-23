import type { Metadata } from 'next';
import { ChartsShowroom } from '@/components/showroom/charts-showroom';

export const metadata: Metadata = { title: 'Charts' };

/** Every chart and finance family at a glance, live on plinths, grouped by job. */
export default function ChartsPage() {
  return <ChartsShowroom />;
}
