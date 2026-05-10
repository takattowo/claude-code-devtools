import { describe, it, expect } from 'vitest';
import { Store, Normalizer } from '@cli-talker/core';
import { buildApp } from '../app.js';

describe('ingest routes', () => {
  it('POST /api/ingest/hook persists payload and returns id', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/hook',
      payload: {
        event: 'SessionStart',
        sessionId: 's1',
        payload: { hook_event_name: 'SessionStart', cwd: '/x' },
        ts: 100,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().id).toBe('number');
    const events = store.listHookEvents(null);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('SessionStart');
    expect(events[0].sessionId).toBe('s1');
    expect(events[0].payload).toEqual({ hook_event_name: 'SessionStart', cwd: '/x' });
    expect(events[0].ts).toBe(100);
    await app.close();
  });

  it('POST /api/ingest/hook rejects missing event', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/hook',
      payload: { sessionId: 's1' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('POST /api/ingest/hook accepts null sessionId and defaults ts', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const before = Date.now();
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/hook',
      payload: { event: 'PostToolUse' },
    });
    expect(res.statusCode).toBe(200);
    const events = store.listHookEvents(null);
    expect(events[0].sessionId).toBeNull();
    expect(events[0].ts).toBeGreaterThanOrEqual(before);
    await app.close();
  });

  it('GET /api/hook-events filters by sessionId and respects limit', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/ingest/hook',
        payload: { event: 'PostToolUse', sessionId: 's1', payload: { i }, ts: i + 1 },
      });
    }
    await app.inject({
      method: 'POST',
      url: '/api/ingest/hook',
      payload: { event: 'Stop', sessionId: 's2', ts: 99 },
    });

    const all = (await app.inject({ method: 'GET', url: '/api/hook-events' })).json().events;
    expect(all).toHaveLength(4);

    const s1 = (await app.inject({ method: 'GET', url: '/api/hook-events?sessionId=s1' })).json().events;
    expect(s1).toHaveLength(3);
    expect(s1.every((e: { sessionId: string }) => e.sessionId === 's1')).toBe(true);

    const limited = (await app.inject({ method: 'GET', url: '/api/hook-events?limit=2' })).json().events;
    expect(limited).toHaveLength(2);
    await app.close();
  });
});
