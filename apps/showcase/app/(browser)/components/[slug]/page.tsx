import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComponentPage } from '@/components/ascii/component-page';
import { componentDoc, componentDocs } from '@/lib/component-docs';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return componentDocs.map((doc) => ({ slug: doc.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = componentDoc((await params).slug);
  return doc ? { title: `${doc.title} · Components`, description: doc.lede } : {};
}

export default async function ComponentRoute({ params }: Props) {
  const doc = componentDoc((await params).slug);
  if (!doc) notFound();
  return <ComponentPage doc={doc} />;
}
