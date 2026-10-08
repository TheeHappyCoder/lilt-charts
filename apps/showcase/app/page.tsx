import type { Metadata } from 'next';
import { HomePage } from '@/components/home/home-page';

/** The home page refreshes its public npm and GitHub counts every six hours. */
export const revalidate = 21600;

export const metadata: Metadata = {
  title: { absolute: 'Lilt Charts · Beautiful React chart cards' },
};

export default async function Page() {
  return <HomePage />;
}
