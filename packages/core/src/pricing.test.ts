import { describe, it, expect } from 'vitest';
import { computeCostUsd } from './pricing.js';

describe('computeCostUsd', () => {
  it('Opus pricing on input + output', () => {
    const cost = computeCostUsd('claude-opus-4-7', { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheCreate: 0 });
    expect(cost).toBeCloseTo(15 + 75, 5);
  });

  it('cache read at 10% of input rate', () => {
    const cost = computeCostUsd('claude-opus-4-7', { input: 0, output: 0, cacheRead: 1_000_000, cacheCreate: 0 });
    expect(cost).toBeCloseTo(1.5, 5);
  });

  it('unknown model returns 0', () => {
    expect(computeCostUsd('mystery', { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 })).toBe(0);
  });
});
