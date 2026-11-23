import type { Metadata } from 'next';
import { VisualsShowroom } from '@/components/showroom/visuals-showroom';

export const metadata: Metadata = {
  title: 'Visuals',
  description: 'Self-contained 3:2 living product visuals in glass, brushed metal and light.',
};

/** Every Visual piece, live on plinths, grouped by shelf. */
export default function VisualsIndex() {
  return <VisualsShowroom />;
}
