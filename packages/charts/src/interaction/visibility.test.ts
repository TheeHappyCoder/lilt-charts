import { describe, expect, it } from 'vitest';
import { reconcileIsolation, type VisibilityIsolation } from './visibility';

describe('visibility isolation', () => {
  const isolated: VisibilityIsolation = {
    id: 'direct',
    restore: ['direct', 'organic'],
    expected: ['direct'],
    previous: ['direct', 'organic'],
  };

  it('retains the return set through a controlled visibility acknowledgement', () => {
    const pending = reconcileIsolation(
      isolated,
      ['direct', 'organic'],
      ['direct', 'organic', 'referral'],
    );
    expect(pending?.restore).toEqual(['direct', 'organic']);
    const accepted = reconcileIsolation(pending, ['direct'], ['direct', 'organic', 'referral']);
    expect(accepted?.previous).toEqual(['direct']);
    expect(reconcileIsolation(accepted, ['organic'], ['direct', 'organic', 'referral'])).toBeNull();
  });

  it('intersects restoration with surviving descriptors and rejects external intent', () => {
    expect(reconcileIsolation(isolated, ['direct'], ['direct', 'referral'])?.restore).toEqual([
      'direct',
    ]);
    expect(
      reconcileIsolation(isolated, ['referral'], ['direct', 'organic', 'referral']),
    ).toBeNull();
    expect(reconcileIsolation(isolated, ['direct'], ['organic', 'referral'])).toBeNull();
  });

  it('does not infer isolation from an ordinary single-series view', () => {
    expect(reconcileIsolation(null, ['direct'], ['direct', 'organic'])).toBeNull();
  });
});
