// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandCopy } from './command-copy';
import { NumberRoll } from './number-roll';
import { StreamText } from './stream-text';
import { formatDuration, ToolTrace } from './tool-trace';
import { ConnectButton } from './connect-button';
import { HoldToConfirm } from './hold-to-confirm';
import { Presence } from './presence';
import { ProfilePhoto } from './profile-photo';
import { DateRange } from './date-range';
import { DataTable, type DataTableColumn } from './data-table';
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
  it('speaks each new status politely and spins on initial render', () => {
    render(<StatusPill status="saving" />);
    const pill = host.querySelector('[role="status"]')!;
    expect(pill.getAttribute('aria-live')).toBe('polite');
    expect(pill.textContent).toBe('Saving changes');
    expect(pill.querySelector('svg.lilt-stp-spin')).not.toBeNull();
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
  it('names the running step while it works, spins header and running rows on mount, and summarises once done', () => {
    const steps = [
      { id: 'a', label: 'Read', detail: 'a.ts', status: 'done' as const, duration: 340 },
      { id: 'b', label: 'Ran', detail: 'tests', status: 'running' as const },
    ];
    render(<ToolTrace steps={steps} defaultOpen />);
    const header = host.querySelector('button')!;
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(header.textContent).toContain('Ran');
    expect(header.querySelector('svg.lilt-ttr-spin')).not.toBeNull();
    expect(host.querySelectorAll('ol svg.lilt-ttr-spin')).toHaveLength(1);
    render(<ToolTrace steps={steps.map((step) => ({ ...step, status: 'done' as const }))} />);
    expect(host.querySelector('button')!.textContent).toContain('Used 2 tools');
    expect(host.querySelectorAll('svg path[d^="M4.8"]')).toHaveLength(3);
    expect(host.querySelectorAll('li')).toHaveLength(2);
  });

  it('writes durations short', () => {
    expect(formatDuration(340)).toBe('340ms');
    expect(formatDuration(1240)).toBe('1.2s');
    expect(formatDuration(12_400)).toBe('12s');
  });
});

describe('ProfilePhoto', () => {
  const buttonLabels = () =>
    Array.from(host.querySelectorAll('button')).map((button) => button.textContent?.trim());

  it('stands in with initials and offers an upload until there is a photo', () => {
    render(<ProfilePhoto name="Nora Vance" />);
    expect(host.querySelector('.lilt-pph-initials')?.textContent).toBe('NV');
    expect(host.querySelector('button[aria-label="Add a photo"]')).not.toBeNull();
    expect(buttonLabels()).toContain('Upload');
    expect(host.querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
      'image/png,image/jpeg,image/webp',
    );
    expect(host.textContent).toContain('PNG, JPG or WebP, at least 400 × 400');
  });

  it('offers Change with a photo, and Remove only when it can remove', () => {
    render(<ProfilePhoto name="Nora Vance" src="/nora.jpg" />);
    expect(host.querySelector('.lilt-pph-face img')?.getAttribute('src')).toBe('/nora.jpg');
    expect(buttonLabels()).toContain('Change');
    expect(buttonLabels()).not.toContain('Remove');
    render(<ProfilePhoto name="Nora Vance" src="/nora.jpg" onRemove={() => undefined} />);
    expect(buttonLabels()).toContain('Remove');
  });

  it('says what a drag holds before the drop, from its count and type alone', () => {
    render(<ProfilePhoto name="Nora Vance" />);
    const root = host.querySelector('.lilt-pph')!;
    const enter = (items: { kind: string; type: string }[]) => {
      const event = new Event('dragenter', { bubbles: true, cancelable: true });
      Object.assign(event, { dataTransfer: { types: ['Files'], items, files: [] } });
      act(() => root.dispatchEvent(event));
    };
    enter([{ kind: 'file', type: 'image/jpeg' }]);
    expect(root.textContent).toContain('Drop to use this photo');
    expect(root.textContent).toContain('1 JPG image');
    expect(host.querySelector('.lilt-pph-avatar')?.getAttribute('data-over')).toBe('ok');
    enter([{ kind: 'file', type: 'application/pdf' }]);
    expect(root.textContent).toContain('PDF files won’t work here');
  });
});

describe('DateRange', () => {
  const today = new Date(2026, 10, 23);
  const day = (date: number) =>
    host.querySelector<HTMLButtonElement>(`button[aria-label$="November ${date}, 2026"]`)!;
  const summary = () => host.querySelector('.lilt-drp-summary')!.textContent ?? '';

  it('opens on the last 7 days and keeps days after today out of reach', () => {
    render(<DateRange today={today} locales="en-US" />);
    expect(host.textContent).toContain('November 2026');
    expect(summary()).toMatch(/Nov 17\s*–\s*23, 2026 · 7 days/);
    expect(day(17).getAttribute('data-end')).toBe('');
    expect(day(20).getAttribute('data-in')).toBe('');
    expect(day(24).disabled).toBe(true);
    expect(host.querySelector('.lilt-drp-preset[aria-pressed="true"]')?.textContent).toBe(
      'Last 7 days',
    );
  });

  it('takes two days in either order and starts on the earlier one', () => {
    const onChange = vi.fn();
    render(<DateRange today={today} locales="en-US" onChange={onChange} />);
    act(() => day(20).click());
    act(() => day(12).click());
    const range = onChange.mock.calls[0]![0] as { start: Date; end: Date };
    expect([range.start.getDate(), range.end.getDate()]).toEqual([12, 20]);
    expect(summary()).toMatch(/Nov 12\s*–\s*20, 2026 · 9 days/);
    expect(host.querySelector('.lilt-drp-preset[aria-pressed="true"]')?.textContent).toBe('Custom');
  });

  it('counts the days as you look for the other end, backwards too', () => {
    render(<DateRange today={today} locales="en-US" />);
    act(() => day(10).click());
    expect(day(17).getAttribute('data-in')).toBeNull();
    act(() => day(18).focus());
    expect(host.querySelector('.lilt-drp-count')?.textContent).toBe('9 days');
    expect(day(18).getAttribute('data-target')).toBe('');
    act(() => day(4).focus());
    expect(host.querySelector('.lilt-drp-count')?.textContent).toBe('7 days');
    expect(summary()).toMatch(/Nov 4\s*–\s*10, 2026 · 7 days/);
  });

  it('draws the period before when comparing', () => {
    const onApply = vi.fn();
    render(<DateRange today={today} locales="en-US" onApply={onApply} />);
    act(() => host.querySelector<HTMLButtonElement>('[role="switch"]')!.click());
    expect(host.querySelector('.lilt-drp-compare-text')!.textContent).toMatch(/Nov 10\s*–\s*16/);
    expect(day(12).getAttribute('data-ghost')).toBe('');
    act(() => host.querySelector<HTMLButtonElement>('.lilt-drp-btn--ink')!.click());
    const [, compare] = onApply.mock.calls[0]! as [unknown, { start: Date; end: Date }];
    expect([compare.start.getDate(), compare.end.getDate()]).toEqual([10, 16]);
  });

  it('hydrates over a page built on another day, then shows the reader’s own week', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const element = <DateRange locales="en-US" />;
    const page = document.createElement('div');
    document.body.append(page);
    const recoverable: unknown[] = [];
    let hydrated: Root | undefined;
    try {
      // Built on the 23rd: a hidden stand-in with no dates written.
      vi.setSystemTime(new Date(2026, 10, 23, 12));
      page.innerHTML = renderToString(element);
      expect(page.querySelector('.lilt-drp')!.hasAttribute('data-stand-in')).toBe(true);
      expect(page.querySelector('.lilt-drp')!.hasAttribute('inert')).toBe(true);
      expect(page.querySelector('.lilt-drp')!.textContent).not.toMatch(/Nov|Jan|2026/);

      // Read on the 30th.
      vi.setSystemTime(new Date(2026, 10, 30, 12));
      await act(async () => {
        hydrated = hydrateRoot(page, element, {
          onRecoverableError: (error) => recoverable.push(error),
        });
      });
      expect(recoverable).toEqual([]);
      const live = page.querySelector('.lilt-drp')!;
      expect(live.hasAttribute('data-stand-in')).toBe(false);
      expect(live.hasAttribute('inert')).toBe(false);
      expect(live.hasAttribute('data-reveal')).toBe(true);
      expect(page.querySelector('.lilt-drp-summary')!.textContent).toMatch(/30, 2026 · 7 days/);
      expect(page.querySelector('[aria-current="date"]')!.textContent).toBe('30');
    } finally {
      if (hydrated) await act(async () => hydrated!.unmount());
      page.remove();
    }
  });

  it('opens without the fade when the browser renders it first', () => {
    render(<DateRange today={today} locales="en-US" />);
    expect(host.querySelector('.lilt-drp')!.hasAttribute('data-reveal')).toBe(false);
    expect(host.querySelector('.lilt-drp')!.hasAttribute('data-stand-in')).toBe(false);
  });
});

describe('DataTable', () => {
  const people = [
    {
      id: 'nora',
      name: 'Nora Vance',
      plan: 'Team',
      status: 'Active',
      seats: 12,
      since: 'Mar 2026',
      mrr: 1140,
    },
    {
      id: 'kofi',
      name: 'Kofi Mensah',
      plan: 'Pro',
      status: 'Active',
      seats: 3,
      since: 'Jan 2026',
      mrr: 87,
    },
    {
      id: 'lena',
      name: 'Lena Fischer',
      plan: 'Team',
      status: 'Trial',
      seats: 8,
      since: 'Nov 2026',
      mrr: null,
    },
    {
      id: 'mateo',
      name: 'Mateo Ruiz',
      plan: 'Enterprise',
      status: 'Active',
      seats: 48,
      since: 'Aug 2025',
      mrr: 4800,
    },
  ];
  type Person = (typeof people)[number];
  const columns: DataTableColumn<Person>[] = [
    { key: 'name', header: 'Customer' },
    { key: 'plan', header: 'Plan', width: 104, priority: 3 },
    {
      key: 'status',
      header: 'Status',
      width: 124,
      priority: 2,
      compact: (person) => <span role="img" aria-label={person.status} />,
    },
    {
      key: 'seats',
      header: 'Seats',
      align: 'end',
      width: 76,
      priority: 4,
      folded: (person) => `${person.seats} seats`,
    },
    {
      key: 'since',
      header: 'Signed up',
      width: 136,
      priority: 5,
      folded: (person) => `since ${person.since}`,
    },
    { key: 'mrr', header: 'MRR', align: 'end', width: 100, priority: 1 },
  ];
  const table = (props: Partial<Parameters<typeof DataTable<Person>>[0]> = {}) => (
    <DataTable
      label="Customers"
      rows={people}
      columns={columns}
      rowKey={(person) => person.id}
      {...props}
    />
  );

  // jsdom lays nothing out, so the table's width and its resize observer are stood in for.
  let width = 900;
  let notify: (() => void)[] = [];
  beforeEach(() => {
    width = 900;
    notify = [];
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('lilt-dt') ? width : 0;
      },
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    // jsdom keeps the real one on Element, so removing ours brings it back.
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  });
  const resize = async (next: number) => {
    width = next;
    act(() => notify.forEach((callback) => callback()));
    await wait(450);
  };
  const headers = () =>
    [...host.querySelectorAll('[role="columnheader"]')].map(
      (cell) => cell.textContent || cell.querySelector('[aria-label]')?.getAttribute('aria-label'),
    );
  const names = () =>
    [...host.querySelectorAll('.lilt-dt-body .lilt-dt-main')].map((cell) => cell.textContent);
  const line = () =>
    host.querySelector('.lilt-dt-body [role="row"] .lilt-dt-folded')?.textContent ?? null;

  it('keeps every column with room, folds the least important under the name as it narrows, and brings them back', async () => {
    render(table());
    await wait(50);
    expect(host.querySelector('[role="table"]')!.getAttribute('aria-label')).toBe('Customers');
    expect(headers()).toEqual(['Customer', 'Plan', 'Status', 'Seats', 'Signed up', 'MRR']);
    expect(line()).toBeNull();

    await resize(560);
    expect(headers()).toEqual(['Customer', 'Plan', 'Status', 'MRR']);
    expect(line()).toBe('12 seats · since Mar 2026');

    // At phone width Plan folds too and Status keeps only its icon, still named for screen readers.
    await resize(360);
    expect(headers()).toEqual(['Customer', 'Status', 'MRR']);
    expect(line()).toBe('Team · 12 seats · since Mar 2026');
    expect(host.querySelector('[role="cell"] [role="img"]')!.getAttribute('aria-label')).toBe(
      'Active',
    );

    await resize(900);
    expect(headers()).toEqual(['Customer', 'Plan', 'Status', 'Seats', 'Signed up', 'MRR']);
    expect(line()).toBeNull();
  });

  it('waits for room to spare before a column comes back', async () => {
    render(table());
    await wait(50);
    // Every column needs 752 (540 of columns, 32 of padding, 180 for the name). At 760 it would
    // fit again, but a folded column only comes back with 24 to spare.
    await resize(740);
    expect(headers()).not.toContain('Signed up');
    await resize(760);
    expect(headers()).not.toContain('Signed up');
    await resize(780);
    expect(headers()).toContain('Signed up');
  });

  it('sorts numbers high to low on the first click, flips on the next, and keeps blanks last', async () => {
    const onSortChange = vi.fn();
    render(table({ onSortChange }));
    await wait(50);
    const mrr = () => host.querySelector<HTMLButtonElement>('[data-col="mrr"] .lilt-dt-sort')!;
    act(() => mrr().click());
    expect(names()).toEqual(['Mateo Ruiz', 'Nora Vance', 'Kofi Mensah', 'Lena Fischer']);
    expect(
      host.querySelector('[data-col="mrr"][role="columnheader"]')!.getAttribute('aria-sort'),
    ).toBe('descending');
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'mrr', direction: 'desc' });
    act(() => mrr().click());
    expect(names()).toEqual(['Kofi Mensah', 'Nora Vance', 'Mateo Ruiz', 'Lena Fischer']);
    expect(
      host.querySelector('[data-col="mrr"][role="columnheader"]')!.getAttribute('aria-sort'),
    ).toBe('ascending');
    // Text sorts A to Z first.
    act(() => host.querySelector<HTMLButtonElement>('[data-col="name"] .lilt-dt-sort')!.click());
    expect(names()).toEqual(['Kofi Mensah', 'Lena Fischer', 'Mateo Ruiz', 'Nora Vance']);
  });

  it('resizes a column from the keyboard and folds a less important one when the name runs short', async () => {
    render(table());
    await wait(50);
    const grip = () => host.querySelector<HTMLElement>('[aria-label="Resize Seats"]')!;
    const press = () =>
      act(() => {
        grip().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }),
        );
      });
    for (let step = 0; step < 4; step++) press();
    expect(grip().getAttribute('aria-valuenow')).toBe('204');
    expect(headers()).toContain('Signed up');
    press();
    await wait(450);
    expect(grip().getAttribute('aria-valuenow')).toBe('236');
    expect(headers()).toEqual(['Customer', 'Plan', 'Status', 'Seats', 'MRR']);
    expect(line()).toBe('since Mar 2026');
    expect(host.querySelector('.lilt-dt')!.getAttribute('style')).toContain('236px');
  });

  it('says so when there is nothing to show, and turns off resizing on request', async () => {
    render(table({ rows: [], resizable: false }));
    await wait(50);
    expect(host.querySelector('.lilt-dt-empty')!.textContent).toBe('Nothing here yet.');
    expect(host.querySelector('[role="separator"]')).toBeNull();
  });
});
