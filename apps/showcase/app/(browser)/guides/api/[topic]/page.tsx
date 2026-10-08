import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiTopicContent } from '@/components/api/api-topic-content';
import { ApiTopicPage } from '@/components/api/api-topic-page';
import { apiTopic, apiTopics, type ApiTopicSlug } from '@/lib/api-topics';

interface Props {
  params: Promise<{ topic: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return apiTopics.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = apiTopic((await params).topic);
  return topic ? { title: `${topic.title} · API reference`, description: topic.summary } : {};
}

export default async function ApiTopicRoute({ params }: Props) {
  const topic = apiTopic((await params).topic);
  if (!topic) notFound();
  return <ApiTopicPage topic={topic}>{apiTopicContent[topic.slug as ApiTopicSlug]}</ApiTopicPage>;
}
