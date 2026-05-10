import { describe, it, expect } from 'vitest';
import { Store, Normalizer } from '@cli-talker/core';
import { buildApp } from './app.js';

describe('app', () => {
  it('GET /health returns ok', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
