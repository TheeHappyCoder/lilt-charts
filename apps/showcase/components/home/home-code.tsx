'use client';

import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CodeBlock } from '@/components/code-block';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { useHomeLook } from '@/components/home/home-look';
import { HomeSheet } from '@/components/home/home-sheet';
import { RevealTitle } from '@/components/home/home-reveal-title';
import { StoryIndex } from '@/components/home/home-story-index';
import { BlurFade } from '@/components/motion/blur-fade';
import { IconSwap } from '@/components/ui/icon-swap';
import { TooltipHint } from '@/components/ui/tooltip';
import { heroPrompt, heroSource, heroWithLook, sceneAlone } from '@/lib/home-hero';

const glide = { type: 'spring', duration: 0.5, bounce: 0.12 } as const;

/** What the reader gets for free, without writing a line of it. */
const included = ['Hover & keyboard', 'Loading states', 'Light & dark', 'Screen readers'];

/**
 * The chart lands one last time, as the result of its own source: the code is generated from the
 * look the reader chose and the interaction they left on, with those lines marked.
 */
export function HomeCode() {
  const { look, scene } = useHomeLook();
  const { code, chosen } = heroSource(look, scene);
  const prompt = heroPrompt(look, scene);
  const tabs = [
    { id: 'code', label: 'sales.tsx', text: code },
    { id: 'prompt', label: 'For your agent', text: prompt },
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('code');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const current = tabs.find((item) => item.id === tab)!;

  // Number the lines so they arrive in order, and mark the ones the reader's choices wrote.
  const body = useRef<HTMLDivElement>(null);
  const chosenKey = chosen.join('|');
  useEffect(() => {
    body.current?.querySelectorAll<HTMLElement>('.lilt-code-line').forEach((line, index) => {
      line.style.setProperty('--line', String(index));
      const text = line.textContent?.trim() ?? '';
      line.toggleAttribute('data-chosen', chosenKey.split('|').includes(text));
    });
  }, [tab, code, chosenKey]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const notch = (
    <>
      <div className="lilt-home-notch__tabs" role="tablist" aria-label="Show">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="lilt-code-panel"
            onClick={() => setTab(item.id)}
          >
            {tab === item.id ? (
              <motion.span
                layoutId="lilt-code-tab"
                className="lilt-home-notch__pill"
                transition={glide}
              />
            ) : null}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <span className="lilt-home-notch__divider" aria-hidden="true" />
      <TooltipHint content={copied ? 'Copied' : `Copy ${current.label}`} side="bottom">
        <button
          type="button"
          className="lilt-home-notch__tool"
          aria-label={copied ? 'Copied' : `Copy ${current.label}`}
          onClick={() => void copy()}
        >
          <IconSwap
            active={copied}
            initial={<Icon icon={Copy01Icon} size={16} strokeWidth={1.8} />}
            alternate={<Icon icon={Tick02Icon} size={16} strokeWidth={2} />}
          />
        </button>
      </TooltipHint>
    </>
  );

  return (
    <section className="lilt-story-code" aria-labelledby="code-title">
      <StoryIndex>In code</StoryIndex>
      <div className="lilt-story-head">
        <RevealTitle id="code-title">
          Your chart.
          <br />
          <em>In a few lines.</em>
        </RevealTitle>
        <BlurFade trigger="scroll" delay={120}>
          <div className="lilt-story-head__aside">
            <p className="lilt-story-lede">
              This is the source for the chart you built on the way down. The lines you chose are
              marked; copy it as it stands.
            </p>
            <ul className="lilt-story-included" aria-label="Included in every card">
              {included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </BlurFade>
      </div>

      {/* No scroll effect here: the chart lands on this sheet, so it must hold still. */}
      <div>
        <HomeSheet notch={notch} className="lilt-story-code__sheet">
          <div className="lilt-story-code__bench">
            <div
              ref={body}
              id="lilt-code-panel"
              role="tabpanel"
              className="lilt-story-code__body"
              data-tab={tab}
            >
              {tab === 'code' ? (
                <CodeBlock code={code} />
              ) : (
                <pre className="lilt-story-code__prompt">{prompt}</pre>
              )}
            </div>
            <figure className="lilt-story-code__output">
              <div data-flight-slot="code" className="lilt-story-code__result" data-lit>
                <CardExamplePreview example={heroWithLook(look, sceneAlone(scene, 'home-code'))} />
              </div>
              <figcaption>
                <span className="lilt-story-code__live" aria-hidden="true">
                  <i />
                  Live
                </span>
                The same card, drawn by the code beside it.
              </figcaption>
            </figure>
          </div>
        </HomeSheet>
      </div>
    </section>
  );
}
