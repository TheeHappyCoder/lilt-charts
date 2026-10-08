'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import Link from 'next/link';
import { useId, useMemo, useRef, useState } from 'react';
import { apiGroups, apiTopicHref, apiTopics, type ApiTopic } from '@/lib/api-topics';

const topics: readonly ApiTopic[] = apiTopics;

/** Every word of the query must appear somewhere in the topic's name, summary or exports. */
function matches(topic: ApiTopic, words: readonly string[]): boolean {
  const text = [topic.title, topic.summary, topic.group, ...topic.exports].join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
}

/**
 * The API reference as a lookup: a filter over every topic and the names it documents, then the
 * topics in their groups as cards that open each topic's own page.
 */
export function ApiIndex() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const shown = useMemo(() => topics.filter((topic) => matches(topic, words)), [words]);

  return (
    <div className="lilt-api">
      <div className="lilt-api__filter">
        <Icon icon={Search01Icon} aria-hidden="true" size={16} className="lilt-api__filter-icon" />
        <input
          ref={inputRef}
          type="search"
          className="lilt-api__filter-input"
          placeholder="Filter topics and exports"
          aria-label="Filter API topics"
          aria-describedby={statusId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query) {
              event.preventDefault();
              setQuery('');
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            className="lilt-api__filter-clear"
            aria-label="Clear filter"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <Icon icon={Cancel01Icon} aria-hidden="true" size={14} />
          </button>
        ) : null}
        <span id={statusId} className="lilt-api__filter-count" role="status">
          {shown.length === topics.length
            ? `${topics.length} topics`
            : `${shown.length} of ${topics.length}`}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="lilt-api__empty">
          Nothing matches “{query.trim()}”. Try a component name such as <code>Legend</code> or a
          prop such as <code>status</code>.
        </p>
      ) : null}

      {apiGroups.map(({ group, description }) => {
        const inGroup = shown.filter((topic) => topic.group === group);
        if (!inGroup.length) return null;
        const headingId = `api-${group.toLowerCase().replace(/[^a-z]+/g, '-')}`;
        return (
          <section key={group} className="lilt-api__group" aria-labelledby={headingId}>
            <header className="lilt-api__group-head">
              <h2 id={headingId}>{group}</h2>
              <p>{description}</p>
            </header>
            <ul className="lilt-api__grid">
              {inGroup.map((topic) => (
                <li key={topic.slug}>
                  <Link className="lilt-api__card" href={apiTopicHref(topic.slug)}>
                    <span className="lilt-api__card-title">
                      {topic.title}
                      <Icon
                        icon={ArrowUpRight01Icon}
                        aria-hidden="true"
                        size={15}
                        className="lilt-api__card-arrow"
                      />
                    </span>
                    <span className="lilt-api__card-summary">{topic.summary}</span>
                    <span className="lilt-api__card-exports">
                      {topic.exports.map((name) => (
                        <code key={name}>{name}</code>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
