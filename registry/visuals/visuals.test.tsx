// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AutoToggle,
  DiffPatch,
  EffortDial,
  EvalRadar,
  GlassCard,
  GrowthBars,
  GuardShield,
  PasskeyScan,
  PrismRouter,
  ReceiptRoll,
  RedactionGlass,
  SignalLens,
  TokenStream,
  UsageCapsule,
} from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const visuals = [
  ['EffortDial', <EffortDial key="effort-dial" />],
  ['PrismRouter', <PrismRouter key="prism-router" />],
  ['TokenStream', <TokenStream key="token-stream" />],
  ['EvalRadar', <EvalRadar key="eval-radar" />],
  ['SignalLens', <SignalLens key="signal-lens" />],
  ['GrowthBars', <GrowthBars key="growth-bars" />],
  ['UsageCapsule', <UsageCapsule key="usage-capsule" />],
  ['PasskeyScan', <PasskeyScan key="passkey-scan" />],
  ['GuardShield', <GuardShield key="guard-shield" />],
  ['RedactionGlass', <RedactionGlass key="redaction-glass" />],
  ['AutoToggle', <AutoToggle key="auto-toggle" />],
  ['DiffPatch', <DiffPatch key="diff-patch" />],
  ['GlassCard', <GlassCard key="glass-card" />],
  ['ReceiptRoll', <ReceiptRoll key="receipt-roll" />],
] as const;

describe('visuals', () => {
  it.each(visuals)('renders %s with an accessible role or control', (_name, element) => {
    act(() => root.render(element));
    const accessible = host.querySelector('[role="img"], [role="slider"], [role="switch"]');
    expect(accessible).not.toBeNull();
  });

  it('flips AutoToggle on click and calls onChange', () => {
    const onChange = vi.fn();
    act(() => root.render(<AutoToggle defaultOn={false} onChange={onChange} />));
    const button = host.querySelector<HTMLButtonElement>('[role="switch"]')!;
    act(() => button.click());
    expect(onChange).toHaveBeenCalledOnce();
  });
});
