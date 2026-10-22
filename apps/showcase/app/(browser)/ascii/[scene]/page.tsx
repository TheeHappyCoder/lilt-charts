import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AsciiScenePage } from '@/components/ascii/ascii-scene-page';
import { asciiScene, scenesIn, sectionOf } from '@/lib/ascii-scenes';

interface Props {
  params: Promise<{ scene: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return scenesIn('ascii').map((scene) => ({ scene: scene.id }));
}

const sceneFor = async (params: Props['params']) => {
  const scene = asciiScene((await params).scene);
  return scene && sectionOf(scene) === 'ascii' ? scene : undefined;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scene = await sceneFor(params);
  return scene ? { title: `${scene.title} · ASCII`, description: scene.lede } : {};
}

export default async function AsciiSceneRoute({ params }: Props) {
  const scene = await sceneFor(params);
  if (!scene) notFound();
  return <AsciiScenePage scene={scene} />;
}
