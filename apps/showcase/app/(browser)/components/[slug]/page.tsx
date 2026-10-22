import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AsciiScenePage } from '@/components/ascii/ascii-scene-page';
import { asciiScene, scenesIn, sectionOf } from '@/lib/ascii-scenes';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return scenesIn('components').map((page) => ({ slug: page.id }));
}

const sceneFor = async (params: Props['params']) => {
  const scene = asciiScene((await params).slug);
  return scene && sectionOf(scene) === 'components' ? scene : undefined;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scene = await sceneFor(params);
  return scene ? { title: `${scene.title} · Components`, description: scene.lede } : {};
}

export default async function ComponentRoute({ params }: Props) {
  const scene = await sceneFor(params);
  if (!scene) notFound();
  return <AsciiScenePage scene={scene} />;
}
