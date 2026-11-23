import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VisualPage } from '@/components/visuals/visual-page';
import { visualDoc, visualDocs } from '@/lib/visual-docs';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return visualDocs.map((doc) => ({ slug: doc.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = visualDoc((await params).slug);
  return doc ? { title: `${doc.title} · Visuals`, description: doc.lede } : {};
}

export default async function VisualRoute({ params }: Props) {
  const doc = visualDoc((await params).slug);
  if (!doc) notFound();
  return <VisualPage doc={doc} />;
}
