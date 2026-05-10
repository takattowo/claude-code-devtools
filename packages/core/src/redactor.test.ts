import { describe, it, expect } from 'vitest';
import { Redactor } from './redactor.js';

describe('Redactor', () => {
  it('returns input unchanged when no patterns and defaults disabled', () => {
    const r = new Redactor({ includeDefaults: false });
    expect(r.enabled).toBe(false);
    expect(r.apply('sk-fake-token-1234567890abcdef')).toBe('sk-fake-token-1234567890abcdef');
  });

  it('redacts default Anthropic-style key', () => {
    const r = new Redactor();
    const out = r.apply('here is sk-ant-api03-AAAAAAAAAAAAAAAAAAAA done');
    expect(out).toBe('here is [REDACTED] done');
  });

  it('redacts custom pattern', () => {
    const r = new Redactor({ patterns: ['hunter2'], includeDefaults: false });
    expect(r.apply('login: user / hunter2')).toBe('login: user / [REDACTED]');
  });

  it('combines defaults with custom patterns', () => {
    const r = new Redactor({ patterns: ['MY_SECRET_\\d+'] });
    expect(r.apply('MY_SECRET_123 and ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'))
      .toBe('[REDACTED] and [REDACTED]');
  });

  it('preserves null and undefined', () => {
    const r = new Redactor();
    expect(r.apply(null)).toBeNull();
    expect(r.apply(undefined)).toBeUndefined();
  });

  it('applyDeep walks nested objects and arrays', () => {
    const r = new Redactor({ patterns: ['secret'], includeDefaults: false });
    const input = {
      a: 'plain',
      b: 'has secret here',
      c: ['ok', 'secret too'],
      d: { nested: 'secret nested' },
      n: 42,
      bool: true,
      nul: null,
    };
    expect(r.applyDeep(input)).toEqual({
      a: 'plain',
      b: 'has [REDACTED] here',
      c: ['ok', '[REDACTED] too'],
      d: { nested: '[REDACTED] nested' },
      n: 42,
      bool: true,
      nul: null,
    });
  });

  it('handles multiple matches in same string', () => {
    const r = new Redactor({ patterns: ['foo'], includeDefaults: false });
    expect(r.apply('foo bar foo baz foo')).toBe('[REDACTED] bar [REDACTED] baz [REDACTED]');
  });
});
