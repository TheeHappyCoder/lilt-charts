// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandCopy } from './command-copy';
import { DynamicIsland } from './dynamic-island';
import { NumberRoll } from './number-roll';
import { StreamText } from './stream-text';
import { SwipeRow } from './swipe-row';
import { ThemeFlip } from './theme-flip';
import { formatDuration, ToolTrace } from './tool-trace';
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
  vi.unstubAllGlobals();
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

describe('NumberRoll', () => {
  it('reads as the plain number and keys digits by place, so a new column is added, not shifted', () => {
    render(<NumberRoll value={999} locales="en-US" />);
    expect(host.textContent).toContain('999');
    render(<NumberRoll value={1000} locales="en-US" />);
    const spoken = host.querySelector('span > span:first-child')!;
    expect(spoken.textContent).toBe('1,000');
  });
});

describe('DynamicIsland', () => {
  it('shows the content for its view', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    render(
      <DynamicIsland view="timer">
        <span>4:59</span>
      </DynamicIsland>,
    );
    expect(host.textContent).toContain('4:59');
  });
});

describe('StreamText', () => {
  it('appends what arrives without remounting the words already there', () => {
    render(<StreamText text="Hello" streaming />);
    const first = host.querySelector('[data-delay]');
    render(<StreamText text="Hello there" streaming />);
    expect(host.querySelector('[data-delay]')).toBe(first);
    expect(host.textContent).toBe('Hello there');
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('starts over when the text is not a continuation', () => {
    render(<StreamText text="Hello there" />);
    render(<StreamText text="Bye" />);
    expect(host.textContent).toBe('Bye');
  });
});

describe('ToolTrace', () => {
  it('names the running step while it works and summarises once done', () => {
    const steps = [
      { id: 'a', label: 'Read', detail: 'a.ts', status: 'done' as const, duration: 340 },
      { id: 'b', label: 'Ran', detail: 'tests', status: 'running' as const },
    ];
    render(<ToolTrace steps={steps} />);
    const header = host.querySelector('button')!;
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(header.textContent).toContain('Ran');
    render(<ToolTrace steps={steps.map((step) => ({ ...step, status: 'done' as const }))} />);
    expect(host.querySelector('button')!.textContent).toContain('Used 2 tools');
    act(() => host.querySelector('button')!.click());
    expect(host.querySelectorAll('li')).toHaveLength(2);
  });

  it('writes durations short', () => {
    expect(formatDuration(340)).toBe('340ms');
    expect(formatDuration(1240)).toBe('1.2s');
    expect(formatDuration(12_400)).toBe('12s');
  });
});

describe('SwipeRow', () => {
  it('offers each action as a button on hover, for mice and keyboards', () => {
    const onAction = vi.fn();
    render(
      <SwipeRow end={{ label: 'Archive', tone: '#8b6cff', onAction, dismiss: false }}>
        <span>Row</span>
      </SwipeRow>,
    );
    const front = host.querySelector<HTMLElement>('[tabindex="0"]')!;
    act(() => front.focus());
    const archive = host.querySelector<HTMLButtonElement>('button[aria-label="Archive"]')!;
    expect(archive).not.toBeNull();
    act(() => archive.click());
    expect(onAction).toHaveBeenCalledOnce();
  });
});

describe('ThemeFlip', () => {
  it('names the theme it switches to and switches without view transitions', () => {
    const onThemeChange = vi.fn();
    render(<ThemeFlip theme="dark" onThemeChange={onThemeChange} />);
    const button = host.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    act(() => button.click());
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });
});
