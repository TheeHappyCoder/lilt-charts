import type { Metadata } from 'next';
import { HomePage } from '@/components/home/home-page';

/** The home page refreshes its GitHub count every six hours. */
export const revalidate = 21600;

export const metadata: Metadata = {
  title: { absolute: 'Lilt UI · Beautiful React components' },
};

export default async function Page() {
  return <HomePage />;
}
