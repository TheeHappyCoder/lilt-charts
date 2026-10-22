// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandCopy } from './command-copy';
import { ConnectButton } from './connect-button';
import { HoldToConfirm } from './hold-to-confirm';
import { Presence } from './presence';
import { StatusPill } from './status-pill';
import { Thinking } from './thinking';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function prefersReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function render(element: React.ReactElement) {
  act(() => root.render(element));
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

beforeEach(() => {
  prefersReducedMotion(false);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('ConnectButton', () => {
  it('is a button that says what it does, with three marks hidden from screen readers', () => {
    render(<ConnectButton />);
    const button = host.querySelector('button')!;
    expect(button.textContent).toBe('Connect your AI');
    expect(button.querySelectorAll('[aria-hidden="true"] svg').length).toBe(3);
  });
});

describe('Thinking', () => {
  it('announces the first step once and holds the width of the longest', () => {
    render(<Thinking steps={['Reading', 'Searching every file']} timer={false} />);
    const status = host.querySelector('[role="status"]')!;
    const spoken = Array.from(status.children).find(
      (child) => child.getAttribute('aria-hidden') !== 'true',
    );
    expect(spoken?.textContent).toBe('Reading…');
    expect(status.textContent).toContain('Searching every file');
  });
});

describe('StatusPill', () => {
  it('speaks each new status politely', () => {
    render(<StatusPill status="saving" />);
    const pill = host.querySelector('[role="status"]')!;
    expect(pill.getAttribute('aria-live')).toBe('polite');
    expect(pill.textContent).toBe('Saving changes');
    render(<StatusPill status="saved" />);
    expect(host.querySelector('[role="status"]')!.textContent).toContain('Saved');
  });
});

describe('Presence', () => {
  it('names every face for the keyboard and folds the rest into a count', () => {
    render(<Presence max={4} />);
    const faces = Array.from(host.querySelectorAll('button'));
    expect(faces).toHaveLength(4);
    expect(faces[0]!.getAttribute('aria-label')).toBe('Ada Okafor, here now. Editing the intro');
    expect(host.textContent).toContain('+2');
    expect(host.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe(
      '6 people, 3 here now',
    );
  });
});

describe('HoldToConfirm', () => {
  it('confirms only when held to the end', async () => {
    const onConfirm = vi.fn();
    render(<HoldToConfirm duration={60} onConfirm={onConfirm} resetAfter={0} />);
    const button = host.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Hold to delete. Press and hold to confirm.');

    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    act(() => {
      button.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    });
    await wait(150);
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await wait(400);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(button.getAttribute('aria-label')).toBe('Deleted');
  });
});

describe('CommandCopy', () => {
  it('switches tools and copies the command shown', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CommandCopy commands={{ pnpm: 'pnpm add x', npm: 'npm install x' }} />);
    const tabs = Array.from(host.querySelectorAll('[role="tab"]'));
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    act(() => (tabs[1] as HTMLButtonElement).click());
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');

    const copy = host.querySelector<HTMLButtonElement>('button[aria-label="Copy command"]')!;
    await act(async () => copy.click());
    expect(writeText).toHaveBeenCalledWith('npm install x');
    expect(host.querySelector('button[aria-label="Copied"]')).not.toBeNull();
  });
});
