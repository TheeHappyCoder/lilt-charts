'use client';

import AiChat02Icon from '@hugeicons/core-free-icons/AiChat02Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ChatGptIcon from '@hugeicons/core-free-icons/ChatGptIcon';
import ClaudeIcon from '@hugeicons/core-free-icons/ClaudeIcon';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import File01Icon from '@hugeicons/core-free-icons/File01Icon';
import PackageIcon from '@hugeicons/core-free-icons/PackageIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { IconSwap } from '@/components/ui/icon-swap';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { TooltipHint } from '@/components/ui/tooltip';

/**
 * Copy, as one split button: the main half copies the code on stage; the menu holds the import,
 * the prompt for an assistant, the page as Markdown, and opening the page in ChatGPT or Claude.
 */
export function StageCopyMenu({
  code,
  importLine,
  prompt,
  title,
  pathname,
}: {
  code: string;
  importLine: string;
  /** What "Copy for AI" copies: a prompt to build what is on stage. */
  prompt: string;
  title: string;
  pathname: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => setCopied(true));
  };
  const markdownPath = `/md${pathname}`;
  // An assistant reads the page from its Markdown, which is the same docs without the chrome.
  const ask = () => {
    const origin = window.location.origin;
    return [
      `I'm looking at the Lilt Charts ${title} documentation: ${origin}${pathname}`,
      `The page as Markdown: ${origin}${markdownPath}`,
      'Help me use it. Be ready to explain the options, give examples, or help debug.',
    ].join('\n');
  };
  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <span className="lilt-split">
      <TooltipHint content={copied ? 'Copied' : 'Copy code'} side="bottom">
        <button
          type="button"
          className="lilt-split__main"
          aria-label={copied ? 'Copied' : 'Copy code'}
          onClick={() => copy(code)}
        >
          <IconSwap
            active={copied}
            initial={<Icon icon={Copy01Icon} aria-hidden="true" size={15} />}
            alternate={<Icon icon={Tick02Icon} aria-hidden="true" size={15} />}
          />
          <span>Copy</span>
        </button>
      </TooltipHint>
      <Menu>
        <MenuTrigger className="lilt-split__more" aria-label="More ways to copy or open">
          <Icon icon={ArrowDown01Icon} aria-hidden="true" size={14} />
        </MenuTrigger>
        <MenuPopup align="end" sideOffset={10}>
          <MenuItem onClick={() => copy(importLine)}>
            <Icon icon={PackageIcon} aria-hidden="true" size={16} />
            Copy import
          </MenuItem>
          <MenuItem onClick={() => copy(prompt)}>
            <Icon icon={AiChat02Icon} aria-hidden="true" size={16} />
            Copy for AI
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => open(markdownPath)}>
            <Icon icon={File01Icon} aria-hidden="true" size={16} />
            View as Markdown
          </MenuItem>
          <MenuItem onClick={() => open(`https://chatgpt.com/?q=${encodeURIComponent(ask())}`)}>
            <Icon icon={ChatGptIcon} aria-hidden="true" size={16} />
            Open in ChatGPT
          </MenuItem>
          <MenuItem onClick={() => open(`https://claude.ai/new?q=${encodeURIComponent(ask())}`)}>
            <Icon icon={ClaudeIcon} aria-hidden="true" size={16} />
            Open in Claude
          </MenuItem>
        </MenuPopup>
      </Menu>
    </span>
  );
}
