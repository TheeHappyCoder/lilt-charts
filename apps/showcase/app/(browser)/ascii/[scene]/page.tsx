import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AsciiScenePage } from '@/components/ascii/ascii-scene-page';
import { asciiScene, asciiScenes } from '@/lib/ascii-scenes';

interface Props {
  params: Promise<{ scene: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return asciiScenes.map((scene) => ({ scene: scene.id }));
}

const sceneFor = async (params: Props['params']) => asciiScene((await params).scene);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scene = await sceneFor(params);
  return scene ? { title: `${scene.title} · ASCII`, description: scene.lede } : {};
}

export default async function AsciiSceneRoute({ params }: Props) {
  const scene = await sceneFor(params);
  if (!scene) notFound();
  return <AsciiScenePage scene={scene} />;
}
