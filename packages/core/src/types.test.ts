import { describe, it, expect } from 'vitest';
import type { Session, AdapterEvent } from './types.js';

describe('types', () => {
  it('Session shape compiles', () => {
    const s: Session = {
      id: 'a', adapter: 'claude-code', cwd: '/x', startedAt: 0, endedAt: null,
      model: 'opus', status: 'active', meta: {},
    };
    expect(s.id).toBe('a');
  });

  it('AdapterEvent discriminated union narrows by type', () => {
    const e: AdapterEvent = { type: 'session-end', sessionId: 'a', endedAt: 1 };
    if (e.type === 'session-end') {
      expect(e.sessionId).toBe('a');
    }
  });
});
