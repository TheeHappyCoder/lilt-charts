import type { Metadata } from 'next';
import { ComponentsShowroom } from '@/components/showroom/components-showroom';

export const metadata: Metadata = {
  title: 'Components',
  description: 'Copy-in React and Motion interface pieces with one detail worth stealing.',
};

/** Every Components piece, live on plinths, grouped by shelf. */
export default function ComponentsIndex() {
  return <ComponentsShowroom />;
}
