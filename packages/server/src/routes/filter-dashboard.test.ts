import { describe, it, expect } from 'vitest';
import { Store, Normalizer } from '@cli-talker/core';
import { buildApp } from '../app.js';

const seed = (store: Store) => {
  const norm = new Normalizer(store);
  const sess = (id: string, cwd: string, model: string, started: number, status: 'active' | 'ended' = 'active') =>
    norm.apply({ type: 'session-start', session: { id, adapter: 'c', cwd, startedAt: started, endedAt: null, model, status, meta: {} } });
  const turn = (id: string, sid: string, idx: number, role: 'user' | 'assistant', text: string, tokens = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }) =>
    norm.apply({ type: 'turn-start', turn: { id, sessionId: sid, index: idx, role, startedAt: 1, endedAt: 1, text, tokens, parentTurnId: null } });
  const call = (id: string, sid: string, name: string, status: 'success' | 'error' = 'success', filePath: string | null = null) =>
    norm.apply({ type: 'tool-call', call: { id, turnId: 't', sessionId: sid, index: 0, name, input: { x: 1 }, output: 'out', status, startedAt: 1, endedAt: 1, durationMs: 0, errorMessage: status === 'error' ? 'boom' : null, filePath } });

  sess('s1', '/repo/alpha', 'claude-opus-4-7', 1000);
  turn('t1a', 's1', 0, 'user', 'find auth bug');
  turn('t1b', 's1', 1, 'assistant', 'looking', { input: 100, output: 50, cacheRead: 1000, cacheCreate: 0 });
  call('c1', 's1', 'Read', 'success', '/repo/alpha/auth.ts');
  call('c2', 's1', 'Bash', 'error');

  sess('s2', '/repo/beta', 'claude-sonnet-4-6', 2000);
  turn('t2', 's2', 0, 'user', 'refactor module');
  call('c3', 's2', 'Edit', 'success', '/repo/beta/util.ts');

  sess('s3', '/repo/alpha', 'unknown', 3000, 'ended');
};

describe('GET /api/sessions filters', () => {
  it('filters by cwd substring', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?cwd=alpha' });
    expect(res.json().sessions.map((s: { id: string }) => s.id).sort()).toEqual(['s1', 's3']);
    await app.close();
  });

  it('filters by model substring', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?model=opus' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s1']);
    await app.close();
  });

  it('filters by status', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?status=ended' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s3']);
    await app.close();
  });

  it('filters by date range', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?since=1500&until=2500' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s2']);
    await app.close();
  });

  it('filters by free-text q across turn + cwd', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?q=refactor' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s2']);
    await app.close();
  });

  it('filters by tool name', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?tool=Edit' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s2']);
    await app.close();
  });

  it('filters by file path substring', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?filePath=auth' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s1']);
    await app.close();
  });

  it('filters hasErrors=1', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/sessions?hasErrors=1' });
    expect(res.json().sessions.map((s: { id: string }) => s.id)).toEqual(['s1']);
    await app.close();
  });
});

describe('GET /api/dashboard', () => {
  it('aggregates totals for full range', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/dashboard' });
    const sum = res.json().summary;
    expect(sum.counts.sessions).toBe(3);
    expect(sum.counts.toolCalls).toBe(3);
    expect(sum.counts.errors).toBe(1);
    expect(sum.tokens.input).toBe(100);
    expect(sum.tokens.output).toBe(50);
    expect(sum.tokens.cacheRead).toBe(1000);
    expect(sum.costUsd).toBeGreaterThan(0);
    expect(sum.costByModel.find((m: { model: string }) => m.model === 'claude-opus-4-7')).toBeDefined();
    expect(sum.topTools[0].name).toBeDefined();
    expect(sum.topFiles.length).toBe(2);
    await app.close();
  });

  it('respects since/until', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?since=1500&until=2500' });
    const sum = res.json().summary;
    expect(sum.counts.sessions).toBe(1);
    expect(sum.counts.toolCalls).toBe(1);
    await app.close();
  });

  it('returns zero when range has no sessions', async () => {
    const store = Store.openInMemory();
    seed(store);
    const app = await buildApp({ store, watcher: null, normalizer: new Normalizer(store) });
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?since=10000' });
    const sum = res.json().summary;
    expect(sum.counts.sessions).toBe(0);
    expect(sum.costUsd).toBe(0);
    expect(sum.topTools).toEqual([]);
    await app.close();
  });
});
