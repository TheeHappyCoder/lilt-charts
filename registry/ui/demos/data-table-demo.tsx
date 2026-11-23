'use client';

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { DataTable, type DataTableColumn } from '../data-table';

type Status = 'active' | 'trial' | 'paused' | 'past-due';

interface Customer {
  id: string;
  name: string;
  plan: string;
  status: Status;
  seats: number;
  /** YYYY-MM-DD */
  signedUp: string;
  mrr: number | null;
}

const customers: readonly Customer[] = [
  {
    id: 'nora',
    name: 'Nora Vance',
    plan: 'Team',
    status: 'active',
    seats: 12,
    signedUp: '2026-03-04',
    mrr: 1140,
  },
  {
    id: 'kofi',
    name: 'Kofi Mensah',
    plan: 'Pro',
    status: 'active',
    seats: 3,
    signedUp: '2026-01-18',
    mrr: 87,
  },
  {
    id: 'lena',
    name: 'Lena Fischer',
    plan: 'Team',
    status: 'trial',
    seats: 8,
    signedUp: '2026-11-12',
    mrr: null,
  },
  {
    id: 'mateo',
    name: 'Mateo Ruiz',
    plan: 'Enterprise',
    status: 'active',
    seats: 48,
    signedUp: '2025-08-02',
    mrr: 4800,
  },
  {
    id: 'aiko',
    name: 'Aiko Tanaka',
    plan: 'Pro',
    status: 'past-due',
    seats: 5,
    signedUp: '2026-06-21',
    mrr: 145,
  },
  {
    id: 'sam',
    name: 'Sam Whitfield',
    plan: 'Starter',
    status: 'paused',
    seats: 1,
    signedUp: '2026-10-09',
    mrr: 19,
  },
];

const STATUS: Record<Status, string> = {
  active: 'Active',
  trial: 'Trial',
  paused: 'Paused',
  'past-due': 'Past due',
};

// Written by hand rather than through Intl, so the server and the browser always agree.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const partsOf = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const day = (iso: string) => {
  const [year, month, date] = partsOf(iso);
  return `${MONTHS[month - 1]} ${date}, ${year}`;
};
const month = (iso: string) => {
  const [year, at] = partsOf(iso);
  return `${MONTHS[at - 1]} ${year}`;
};
const money = (amount: number) => `$${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

/** A status is an icon that means it: a tick, a dashed ring for waiting, a mark for trouble. */
function StatusIcon({ status }: { status: Status }) {
  return (
    <svg
      aria-hidden="true"
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      className="lilt-dtd-icon"
      data-status={status}
    >
      {status === 'active' ? (
        <path
          d="M3 7.2 5.8 10 11 4.2"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : status === 'past-due' ? (
        <>
          <circle cx={7} cy={7} r={5.4} stroke="currentColor" strokeWidth={1.5} />
          <path d="M7 4.3v3.3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={7} cy={9.7} r={0.85} fill="currentColor" />
        </>
      ) : (
        <circle
          cx={7}
          cy={7}
          r={5.4}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="2.4 3.25"
        />
      )}
    </svg>
  );
}

const columns: readonly DataTableColumn<Customer>[] = [
  {
    key: 'name',
    header: 'Customer',
    lead: (customer) => (
      <span className="lilt-dtd-avatar" aria-hidden="true">
        {initials(customer.name)}
      </span>
    ),
  },
  { key: 'plan', header: 'Plan', width: 104, priority: 3 },
  {
    key: 'status',
    header: 'Status',
    width: 124,
    priority: 2,
    value: (customer) => STATUS[customer.status],
    cell: (customer) => (
      <span className="lilt-dtd-status">
        <StatusIcon status={customer.status} />
        {STATUS[customer.status]}
      </span>
    ),
    compact: (customer) => (
      <span className="lilt-dtd-status" role="img" aria-label={STATUS[customer.status]}>
        <StatusIcon status={customer.status} />
      </span>
    ),
    folded: (customer) => STATUS[customer.status],
  },
  {
    key: 'seats',
    header: 'Seats',
    align: 'end',
    width: 76,
    priority: 4,
    folded: (customer) => `${customer.seats} ${customer.seats === 1 ? 'seat' : 'seats'}`,
  },
  {
    key: 'signedUp',
    header: 'Signed up',
    width: 136,
    priority: 5,
    cell: (customer) => <span className="lilt-dtd-quiet">{day(customer.signedUp)}</span>,
    folded: (customer) => `since ${month(customer.signedUp)}`,
  },
  {
    key: 'mrr',
    header: 'MRR',
    align: 'end',
    width: 100,
    priority: 1,
    cell: (customer) =>
      customer.mrr === null ? (
        <span className="lilt-dtd-quiet" aria-label="None yet">
          —
        </span>
      ) : (
        <span className="lilt-dtd-amount">{money(customer.mrr)}</span>
      ),
    folded: (customer) => (customer.mrr === null ? 'no MRR yet' : `${money(customer.mrr)} MRR`),
  },
];

const NATURAL = 640; // the width in a frame that sizes to its content, such as a wall tile
const WIDEST = 960;
const NARROWEST = 360;
const HANDLE = 22;

/**
 * The docs stage's table, in a frame you resize from its right edge: narrow it and watch columns
 * fold into the line under each name, widen it and they come back.
 */
export function DataTableDemo({
  resizable = true,
  style,
}: {
  resizable?: boolean;
  style?: CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const parent = box.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const styles = getComputedStyle(parent);
      setRoom(
        parent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight),
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // A stage with room is filled up to the widest; one narrower than the natural width is
  // followed; a parent that sizes to its content, which measures the same as us, gets NATURAL.
  const widest =
    room >= NATURAL + HANDLE
      ? Math.min(WIDEST, room - HANDLE)
      : room > 0 && room < NATURAL - 1
        ? Math.max(NARROWEST, room - HANDLE)
        : NATURAL;
  const width = Math.round(Math.max(NARROWEST, Math.min(chosen ?? widest, widest)));
  const clamp = (next: number) => Math.round(Math.max(NARROWEST, Math.min(next, widest)));

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;
    setDragging(true);
    // The frame sits in the middle of the stage, so its edge moves half as far as its width.
    const move = (moved: globalThis.PointerEvent) =>
      setChosen(clamp(startWidth + (moved.clientX - startX) * 2));
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      setDragging(false);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 20;
    const next =
      event.key === 'ArrowLeft'
        ? width - step
        : event.key === 'ArrowRight'
          ? width + step
          : event.key === 'Home'
            ? NARROWEST
            : event.key === 'End'
              ? widest
              : null;
    if (next === null) return;
    event.preventDefault();
    setChosen(clamp(next));
  };

  // The table only re-renders for its own reasons; the frame's width reaches it as a resize.
  const table = useMemo(
    () => (
      <DataTable
        label="Customers"
        rows={customers}
        columns={columns}
        rowKey={(customer) => customer.id}
        resizable={resizable}
      />
    ),
    [resizable],
  );

  return (
    <>
      <style href="lilt-ui-data-table-demo" precedence="default">
        {css}
      </style>
      <div ref={box} className="lilt-dtd" style={{ ...style, width }}>
        <div className="lilt-dtd-ruler" aria-hidden="true">
          <span className="lilt-dtd-cap" />
          <span className="lilt-dtd-rule" />
          <span className="lilt-dtd-width">{width}</span>
          <span className="lilt-dtd-rule" />
          <span className="lilt-dtd-cap" />
        </div>
        <div className="lilt-dtd-frame">
          {table}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Table width"
            aria-valuenow={width}
            aria-valuemin={NARROWEST}
            aria-valuemax={widest}
            tabIndex={0}
            className="lilt-dtd-handle"
            data-active={dragging || undefined}
            onPointerDown={onDown}
            onKeyDown={onKey}
          />
        </div>
      </div>
    </>
  );
}

const css = /* css */ `
.lilt-dtd {
  --dtd-rule: rgb(26 26 24 / 0.14);
  --dtd-faint: #8c8c87;
  --dtd-quiet: #6b6b66;
  --dtd-handle: rgb(26 26 24 / 0.18);
  --dtd-ink: #1a1a18;
  --dtd-avatar: rgb(26 26 24 / 0.07);
  --dtd-avatar-ink: #44443f;
  --dtd-accent: #7c5cff;
  --dtd-danger: #d93848;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 100%;
}
:where(.dark, [data-theme="dark"]) .lilt-dtd {
  --dtd-rule: rgb(244 244 242 / 0.16);
  --dtd-faint: #73736e;
  --dtd-quiet: #a3a39d;
  --dtd-handle: rgb(244 244 242 / 0.22);
  --dtd-ink: #f4f4f2;
  --dtd-avatar: rgb(244 244 242 / 0.1);
  --dtd-avatar-ink: #c9c9c3;
  --dtd-accent: #9a82ff;
  --dtd-danger: #f05d6c;
}
[data-theme="light"] .lilt-dtd {
  --dtd-rule: rgb(26 26 24 / 0.14);
  --dtd-faint: #8c8c87;
  --dtd-quiet: #6b6b66;
  --dtd-handle: rgb(26 26 24 / 0.18);
  --dtd-ink: #1a1a18;
  --dtd-avatar: rgb(26 26 24 / 0.07);
  --dtd-avatar-ink: #44443f;
  --dtd-accent: #7c5cff;
  --dtd-danger: #d93848;
}
.lilt-dtd-ruler {
  display: flex;
  align-items: center;
  height: 12px;
  color: var(--dtd-faint);
  font-size: 11px;
  line-height: 12px;
  font-variant-numeric: tabular-nums;
}
.lilt-dtd-cap { width: 1px; height: 8px; background: var(--dtd-rule); }
.lilt-dtd-rule { flex: 1; height: 1px; background: var(--dtd-rule); }
.lilt-dtd-width { padding-inline: 10px; }
.lilt-dtd-frame { position: relative; }
.lilt-dtd-handle {
  position: absolute;
  top: 0;
  right: -${HANDLE}px;
  bottom: 0;
  display: grid;
  place-items: center;
  width: ${HANDLE}px;
  cursor: ew-resize;
  touch-action: none;
  outline: none;
}
.lilt-dtd-handle::before {
  content: "";
  width: 4px;
  height: 40px;
  border-radius: 4px;
  background: var(--dtd-handle);
  transition: background-color 160ms, height 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.lilt-dtd-handle:hover::before,
.lilt-dtd-handle[data-active]::before { height: 56px; background: var(--dtd-ink); }
.lilt-dtd-handle:focus-visible::before { height: 56px; background: var(--dtd-accent); }
.lilt-dtd-avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--dtd-avatar);
  color: var(--dtd-avatar-ink);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1;
}
.lilt-dtd-status { display: inline-flex; align-items: center; gap: 8px; }
.lilt-dtd-icon { flex: none; color: var(--dtd-accent); }
.lilt-dtd-icon[data-status="paused"] { color: var(--dtd-faint); }
.lilt-dtd-icon[data-status="past-due"] { color: var(--dtd-danger); }
.lilt-dtd-quiet { color: var(--dtd-quiet); }
.lilt-dtd-amount { font-weight: 500; }
`;
