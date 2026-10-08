import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/docs/page-header';
import { GuideSection } from '@/components/guide-page';
import { apiNeighbours, apiTopicHref, type ApiTopic } from '@/lib/api-topics';

/**
 * One API topic on its own page: a trail back to the index, the topic's prose and code, and the
 * neighbouring topics so the reference still reads front to back.
 */
export function ApiTopicPage({ topic, children }: { topic: ApiTopic; children: ReactNode }) {
  const { previous, next } = apiNeighbours(topic.slug);
  return (
    <article className="lilt-main lilt-docs lilt-learn lilt-api-topic">
      <PageHeader
        eyebrow={
          <nav className="lilt-api-topic__trail" aria-label="Breadcrumb">
            <Link href="/guides/api">API reference</Link>
            <span aria-hidden="true">/</span>
            <span>{topic.group}</span>
          </nav>
        }
        title={topic.title}
        lede={topic.summary}
      />
      <ul className="lilt-api-topic__exports" aria-label="Documented here">
        {topic.exports.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
      <GuideSection>{children}</GuideSection>
      <nav className="lilt-api-topic__pager" aria-label="More topics">
        {previous ? (
          <Link className="lilt-api-topic__step" href={apiTopicHref(previous.slug)} rel="prev">
            <span className="lilt-api-topic__step-label">
              <Icon icon={ArrowLeft01Icon} aria-hidden="true" size={14} />
              Previous
            </span>
            <span className="lilt-api-topic__step-title">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            className="lilt-api-topic__step"
            data-next=""
            href={apiTopicHref(next.slug)}
            rel="next"
          >
            <span className="lilt-api-topic__step-label">
              Next
              <Icon icon={ArrowRight01Icon} aria-hidden="true" size={14} />
            </span>
            <span className="lilt-api-topic__step-title">{next.title}</span>
          </Link>
        ) : (
          <Link className="lilt-api-topic__step" data-next="" href="/guides/api">
            <span className="lilt-api-topic__step-label">
              Back to
              <Icon icon={ArrowRight01Icon} aria-hidden="true" size={14} />
            </span>
            <span className="lilt-api-topic__step-title">All topics</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
