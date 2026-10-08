'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon';
import Calendar03Icon from '@hugeicons/core-free-icons/Calendar03Icon';
import CubeIcon from '@hugeicons/core-free-icons/CubeIcon';
import DashboardSquare01Icon from '@hugeicons/core-free-icons/DashboardSquare01Icon';
import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';
import HandBag01Icon from '@hugeicons/core-free-icons/HandBag01Icon';
import HatIcon from '@hugeicons/core-free-icons/HatIcon';
import HoodieIcon from '@hugeicons/core-free-icons/HoodieIcon';
import Invoice01Icon from '@hugeicons/core-free-icons/Invoice01Icon';
import Link01Icon from '@hugeicons/core-free-icons/Link01Icon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import PackageIcon from '@hugeicons/core-free-icons/PackageIcon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import Shirt01Icon from '@hugeicons/core-free-icons/Shirt01Icon';
import SocksIcon from '@hugeicons/core-free-icons/SocksIcon';
import Square01Icon from '@hugeicons/core-free-icons/Square01Icon';
import TShirtIcon from '@hugeicons/core-free-icons/TShirtIcon';
import UserGroupIcon from '@hugeicons/core-free-icons/UserGroupIcon';
import { BarChartCard, HorizontalBarChartCard, StatCard } from '@lilt-ui/charts';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ThemeModeSwitcher } from '@/components/shell/theme-switcher';
import { TooltipHint } from '@/components/ui/tooltip';
import { StoreCommandMenu, type StoreCommand } from './store-command-menu';
import {
  formatDay,
  recentOrders,
  storeCsv,
  storePeriods,
  storeSummary,
  type ProductId,
  type StorePeriod,
  type StoreSummary,
} from './store-data';
import { StoreToast, useStoreToast } from './store-toast';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const cents = { ...usd, minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
const rate = { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
const money = new Intl.NumberFormat('en-US', usd);
const compactMoney = new Intl.NumberFormat('en-US', {
  ...usd,
  notation: 'compact',
  maximumFractionDigits: 1,
});
const count = new Intl.NumberFormat('en-US');
const percent = (value: number, digits = 1) => `${(Math.abs(value) * 100).toFixed(digits)}%`;

/** Charts take the page's two inks: graphite for the data, the accent only for what matters. */
const INK = 'var(--g-data)';
const INK_SOFT = 'var(--g-data-soft)';
const ACCENT = 'var(--g-accent)';

const sections = [
  { id: 'overview', label: 'Overview', icon: DashboardSquare01Icon },
  { id: 'performance', label: 'Performance', icon: UserGroupIcon },
  { id: 'products', label: 'Products', icon: PackageIcon },
  { id: 'orders', label: 'Orders', icon: Invoice01Icon },
] as const;
const productIcons: Record<ProductId, typeof PackageIcon> = {
  overshirt: Shirt01Icon,
  hoodie: HoodieIcon,
  tote: HandBag01Icon,
  beanie: HatIcon,
  tee: TShirtIcon,
  socks: SocksIcon,
};
const stageSeries = [
  { key: 'revenue', label: 'Revenue', color: INK },
  { key: 'launch', label: 'Autumn drop', color: ACCENT },
] as const;
const customerSeries = [
  { key: 'returning', label: 'Returning', color: ACCENT },
  { key: 'firstTime', label: 'First-time', color: INK_SOFT },
] as const;
type SortKey = 'revenue' | 'units' | 'change';

/** Reads the shared state from the URL once hydrated, and keeps the URL in step after that. */
function useUrlState() {
  const [period, setPeriod] = useState<StorePeriod>(30);
  const [depth, setDepth] = useState(true);
  const ready = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const asked = Number(params.get('period'));
    if (storePeriods.includes(asked as StorePeriod)) setPeriod(asked as StorePeriod);
    if (params.get('view') === 'flat') setDepth(false);
    ready.current = true;
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    const params = new URLSearchParams(location.search);
    if (period === 30) params.delete('period');
    else params.set('period', String(period));
    if (depth) params.delete('view');
    else params.set('view', 'flat');
    const query = params.toString();
    history.replaceState(
      null,
      '',
      `${location.pathname}${query ? `?${query}` : ''}${location.hash}`,
    );
  }, [period, depth]);
  return { period, setPeriod, depth, setDepth };
}

/** A change under 1% is noise, so it reads neutral rather than good or bad. */
function Delta({ value }: { value: number }) {
  const tone = Math.abs(value) < 0.01 ? 'flat' : value > 0 ? 'good' : 'bad';
  return (
    <span className="g-delta" data-tone={tone}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {percent(value)}
    </span>
  );
}

function Segmented<Value extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string; name: string }[];
  onChange: (value: Value) => void;
}) {
  const id = useId();
  const reduced = useReducedMotion();
  return (
    <div className="g-seg" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={String(option.value)}
            className="g-seg__option"
            data-selected={selected || undefined}
          >
            <input
              type="radio"
              name={id}
              checked={selected}
              aria-label={option.name}
              onChange={() => onChange(option.value)}
            />
            {selected ? (
              <motion.span
                className="g-seg__thumb"
                layoutId={`seg-${id}`}
                initial={false}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0.1 }
                }
              />
            ) : null}
            <span className="g-seg__label">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/** The facts under the stage: what a reader would otherwise have to work out. */
function Facts({ summary }: { summary: StoreSummary }) {
  const rising = [...summary.sources].sort((a, b) => b.change - a.change)[0]!;
  const toGoal = summary.revenue / summary.goal;
  return (
    <dl className="g-facts">
      <div>
        <dt>Best day</dt>
        <dd>
          {money.format(summary.best.revenue)}
          <span>
            {formatDay(summary.best.date)}
            {summary.best.isLaunch ? ' · Autumn drop' : ''}
          </span>
        </dd>
      </div>
      <div>
        <dt>Goal</dt>
        <dd>
          {Math.round(toGoal * 100)}%<span>of {money.format(summary.goal)}</span>
        </dd>
      </div>
      <div>
        <dt>Next 7 days</dt>
        <dd>
          ≈ {compactMoney.format(summary.forecastTotal)}
          <span>forecast</span>
        </dd>
      </div>
      <div>
        <dt>Fastest source</dt>
        <dd>
          {rising.source}
          <span>
            <Delta value={rising.change} /> sessions
          </span>
        </dd>
      </div>
    </dl>
  );
}

function ProductsTable({ summary }: { summary: StoreSummary }) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'revenue',
    descending: true,
  });
  const rows = useMemo(() => {
    const value = (row: StoreSummary['products'][number]) =>
      sort.key === 'change' ? (row.change ?? Number.POSITIVE_INFINITY) : row[sort.key];
    return [...summary.products].sort((a, b) =>
      sort.descending ? value(b) - value(a) : value(a) - value(b),
    );
  }, [summary.products, sort]);
  const header = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return (
      <th scope="col" aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          className="g-sort"
          data-active={active || undefined}
          onClick={() =>
            setSort((current) => ({
              key,
              descending: current.key === key ? !current.descending : true,
            }))
          }
        >
          {label}
          <Icon
            icon={active && !sort.descending ? ArrowUp01Icon : ArrowDown01Icon}
            size={12}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </th>
    );
  };
  return (
    <section
      id="products"
      tabIndex={-1}
      className="g-panel g-products"
      aria-labelledby="products-title"
    >
      <header className="g-panel__head">
        <h2 id="products-title">Products</h2>
        <span>{summary.range}</span>
      </header>
      <div className="g-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              {header('units', 'Units')}
              {header('revenue', 'Revenue')}
              {header('change', 'Change')}
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id}>
                <th scope="row">
                  <span className="g-product-cell">
                    <span className="g-thumb" aria-hidden="true">
                      <Icon icon={productIcons[product.id]} size={18} strokeWidth={1.5} />
                    </span>
                    <span className="g-product">
                      <strong>{product.name}</strong>
                      <span>
                        {product.category} · {money.format(product.price)}
                      </span>
                    </span>
                  </span>
                </th>
                <td>{count.format(product.units)}</td>
                <td>
                  <span className="g-share">
                    {money.format(product.revenue)}
                    <i aria-hidden="true">
                      <i style={{ width: `${product.share * 100}%` }} />
                    </i>
                  </span>
                </td>
                <td>
                  {product.change === null ? (
                    <span className="g-tag" data-tone="accent">
                      New
                    </span>
                  ) : (
                    <Delta value={product.change} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentOrders() {
  return (
    <section id="orders" tabIndex={-1} className="g-panel g-orders" aria-labelledby="orders-title">
      <header className="g-panel__head">
        <h2 id="orders-title">Recent orders</h2>
        <span className="g-live">
          <i aria-hidden="true" />
          Live · 09:41
        </span>
      </header>
      <ul>
        {recentOrders.map((order) => (
          <li key={order.id}>
            <span className="g-avatar" aria-hidden="true">
              {order.initials}
            </span>
            <span className="g-orders__who">
              <strong>{order.customer}</strong>
              <span>{order.items}</span>
            </span>
            <span className="g-orders__what">
              <strong data-refunded={order.status === 'Refunded' || undefined}>
                {money.format(order.total)}
              </strong>
              <span>
                <span className="g-tag" data-tone={order.status.toLowerCase()}>
                  {order.status}
                </span>
                {order.minutes < 60 ? `${order.minutes}m` : `${Math.floor(order.minutes / 60)}h`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ThreeDTemplate() {
  const { period, setPeriod, depth, setDepth } = useUrlState();
  const [active, setActive] = useState<string>('overview');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mac, setMac] = useState(true);
  const { toast, show, dismiss } = useStoreToast();
  const { resolvedTheme, setTheme } = useTheme();
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const sync = `store-${id}`;
  const summary = useMemo(() => storeSummary(period), [period]);

  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  // ⌘K / Ctrl+K anywhere, and "/" outside text fields.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable]',
      );
      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // The tabs follow the section in view.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.35;
      const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      const current = atEnd
        ? targets.at(-1)
        : targets.filter((target) => target.getBoundingClientRect().top <= line).at(-1);
      setActive(current?.id ?? 'overview');
    };
    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('scrollend', onScroll);
    return () => {
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('scrollend', onScroll);
    };
  }, []);

  const goTo = useCallback(
    (section: string) => {
      setActive(section);
      const target = document.getElementById(section);
      target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      target?.focus({ preventScroll: true });
    },
    [reduced],
  );
  const exportCsv = useCallback(() => {
    const url = URL.createObjectURL(
      new Blob([storeCsv(summary.days)], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sunday-supply-${period}-days.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    show('Report exported', `${period} days · ${count.format(summary.orders)} orders · CSV`);
  }, [summary, period, show]);
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      show('Link copied', `Opens on the last ${period} days, ${depth ? '3D' : 'flat'}`);
    } catch {
      show('Couldn’t copy the link', 'Copy it from the address bar instead');
    }
  }, [period, depth, show]);

  const commands = useMemo<StoreCommand[]>(
    () => [
      ...sections.map((section) => ({
        id: `go-${section.id}`,
        group: 'Go to',
        label: section.label,
        icon: section.icon,
        run: () => goTo(section.id),
      })),
      ...storePeriods.map((days) => ({
        id: `period-${days}`,
        group: 'Period',
        label: `Last ${days} days`,
        icon: Calendar03Icon,
        keywords: 'range date period',
        checked: period === days,
        run: () => setPeriod(days),
      })),
      {
        id: 'depth',
        group: 'View',
        label: depth ? 'Show flat charts' : 'Show 3D charts',
        icon: depth ? Square01Icon : CubeIcon,
        keywords: 'depth 3d flat',
        run: () => setDepth(!depth),
      },
      {
        id: 'theme',
        group: 'View',
        label: resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: Moon02Icon,
        keywords: 'theme dark light appearance',
        run: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'export',
        group: 'Actions',
        label: `Export last ${period} days as CSV`,
        icon: Download04Icon,
        keywords: 'download report csv',
        run: exportCsv,
      },
      {
        id: 'copy',
        group: 'Actions',
        label: 'Copy link to this view',
        icon: Link01Icon,
        keywords: 'share url',
        run: () => void copyLink(),
      },
    ],
    [goTo, period, setPeriod, depth, setDepth, resolvedTheme, setTheme, exportCsv, copyLink],
  );

  const shortcut = mac ? '⌘K' : 'Ctrl K';

  return (
    <div className="g" data-depth={depth || undefined}>
      <a className="g-skip" href="#overview">
        Skip to dashboard
      </a>
      <div className="g-scroll" ref={scrollRef}>
        <header className="g-top">
          <div className="g-top__bar">
            <Link
              className="g-brand"
              href="#overview"
              onClick={(event) => {
                event.preventDefault();
                goTo('overview');
              }}
            >
              <span className="g-brand__mark" aria-hidden="true" />
              Sunday
            </Link>
            <nav className="g-tabs" aria-label="Dashboard">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={active === section.id ? 'location' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(section.id);
                  }}
                >
                  {active === section.id ? (
                    <motion.span
                      className="g-tabs__line"
                      layoutId={`tab-${id}`}
                      initial={false}
                      transition={
                        reduced ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0.1 }
                      }
                    />
                  ) : null}
                  {section.label}
                </a>
              ))}
            </nav>
            <div className="g-top__tools">
              <button
                type="button"
                className="g-search"
                onClick={() => setSearchOpen(true)}
                aria-keyshortcuts="Meta+K Control+K /"
              >
                <Icon icon={Search01Icon} size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>Search</span>
                <kbd>{shortcut}</kbd>
              </button>
              <ThemeModeSwitcher compact start="top-right" />
              <span className="g-avatar g-avatar--me" aria-label="Jamie Lee, owner" role="img">
                JL
              </span>
            </div>
          </div>
        </header>

        <main className="g-main">
          {/* The stage: the number is the hero, the 3D chart is what it stands on. */}
          <section id="overview" tabIndex={-1} className="g-stage" aria-labelledby="stage-title">
            <div className="g-stage__bar">
              <p className="g-eyebrow" id="stage-title">
                Sunday Supply <span aria-hidden="true">/</span> Net revenue
                <span className="g-eyebrow__range">{summary.range}</span>
              </p>
              <div className="g-stage__tools">
                <Segmented
                  label="Reporting period"
                  value={period}
                  onChange={setPeriod}
                  options={storePeriods.map((days) => ({
                    value: days,
                    label: `${days}D`,
                    name: `Last ${days} days`,
                  }))}
                />
                <Segmented
                  label="Chart depth"
                  value={depth}
                  onChange={setDepth}
                  options={[
                    { value: false, label: 'Flat', name: 'Flat charts' },
                    { value: true, label: '3D', name: '3D charts' },
                  ]}
                />
                <TooltipHint content="Copy link to this view" side="bottom">
                  <button
                    type="button"
                    className="g-icon-button"
                    aria-label="Copy link to this view"
                    onClick={() => void copyLink()}
                  >
                    <Icon icon={Link01Icon} size={16} strokeWidth={1.8} />
                  </button>
                </TooltipHint>
                <button
                  type="button"
                  className="g-button"
                  aria-label={`Export last ${period} days as CSV`}
                  onClick={exportCsv}
                >
                  <Icon icon={Download04Icon} size={15} strokeWidth={1.9} aria-hidden="true" />
                  <span>Export</span>
                </button>
              </div>
            </div>
            <div className="g-stage__chart">
              <BarChartCard
                title="Net revenue"
                data={summary.stageRows}
                x="date"
                series={stageSeries}
                stack
                pillValue="stack"
                headline={summary.revenue}
                delta={summary.revenueChange}
                valueFormat={usd}
                forecast={{ from: summary.forecastFrom, label: 'Forecast' }}
                target={{ value: summary.dailyGoal, label: 'Daily goal' }}
                depth={depth}
                sync={sync}
                surface="ghost"
                tiles={false}
                axis="minimal"
                background="none"
                height={340}
              />
            </div>
            <Facts summary={summary} />
          </section>

          <section id="performance" tabIndex={-1} className="g-strip" aria-label="Key metrics">
            <StatCard
              title="Orders"
              data={summary.days}
              value="orders"
              x="date"
              chart="bars"
              headline={summary.orders}
              delta={summary.ordersChange}
              color={INK}
              depth={depth}
              sync={sync}
              surface="ghost"
              height={40}
            />
            <StatCard
              title="Units sold"
              data={summary.days}
              value="units"
              x="date"
              chart="line"
              headline={summary.units}
              delta={summary.unitsChange}
              color={INK}
              depth={depth}
              sync={sync}
              surface="ghost"
              height={40}
            />
            <StatCard
              title="Conversion"
              data={summary.days.map((day) => ({
                date: day.date,
                rate: day.orders / day.sessions,
              }))}
              value="rate"
              x="date"
              aggregate="mean"
              chart="line"
              headline={summary.conversion}
              delta={summary.conversionChange}
              valueFormat={rate}
              color={INK}
              depth={depth}
              sync={sync}
              surface="ghost"
              height={40}
            />
            <StatCard
              title="Avg. order value"
              data={summary.days.map((day) => ({
                date: day.date,
                value: day.revenue / day.orders,
              }))}
              value="value"
              x="date"
              aggregate="mean"
              chart="line"
              headline={summary.averageOrder}
              delta={summary.averageOrderChange}
              valueFormat={cents}
              color={INK}
              depth={depth}
              sync={sync}
              surface="ghost"
              height={40}
            />
          </section>

          <div className="g-grid">
            <div className="g-panel g-span-customers">
              <BarChartCard
                title="Returning customers"
                data={summary.days}
                x="date"
                series={customerSeries}
                stack
                headline={summary.returning}
                headlineSeries="returning"
                delta={summary.returningChange}
                depth={depth}
                sync={sync}
                surface="ghost"
                legend="inline"
                axis="minimal"
                background="none"
                height={268}
              />
            </div>
            <div className="g-panel g-span-traffic">
              <HorizontalBarChartCard
                title="Traffic by source"
                data={summary.sources}
                category="source"
                value="sessions"
                delta={summary.sessionsChange}
                color={INK}
                share
                depth={depth}
                surface="ghost"
              />
            </div>
            <div className="g-panel g-span-markets">
              <HorizontalBarChartCard
                title="Customers by market"
                data={summary.markets}
                category="country"
                value="customers"
                delta={summary.customersChange}
                color={INK}
                share
                limit={5}
                otherLabel="Rest of world"
                depth={depth}
                surface="ghost"
              />
            </div>
            <div className="g-span-products">
              <ProductsTable summary={summary} />
            </div>
            <div className="g-span-orders">
              <RecentOrders />
            </div>
          </div>

          <footer className="g-footer">
            <span>Sunday Supply is a fictional store. Every number is sample data.</span>
            <Link href="/">Charts by Lilt</Link>
          </footer>
        </main>
      </div>

      <StoreCommandMenu open={searchOpen} onOpenChange={setSearchOpen} commands={commands} />
      <StoreToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
