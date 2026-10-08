import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Templates are unpublished work: they render locally and on preview deployments, and answer
 * 404 on the production site until they are ready to ship.
 */
export default function TemplatesLayout({ children }: { children: ReactNode }) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return children;
}
