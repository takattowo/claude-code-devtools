import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store, Normalizer } from '@cli-talker/core';
import { createClaudeCodeAdapter } from '@cli-talker/adapter-claude-code';
import { Watcher } from './watcher.js';

describe('Watcher', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-talker-watch-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('processes initial file content and emits to normalizer', async () => {
    const projectDir = path.join(tmp, '-tmp-proj');
    await fs.mkdir(projectDir, { recursive: true });
    const sessionFile = path.join(projectDir, 'sw-1.jsonl');
    const line = JSON.stringify({
      type: 'user', sessionId: 'sw-1', cwd: '/tmp/proj', uuid: 'u1',
      timestamp: '2026-05-10T10:00:00Z',
      message: { role: 'user', content: 'hi' },
    }) + '\n';
    await fs.writeFile(sessionFile, line);

    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const adapter = createClaudeCodeAdapter();
    const watcher = new Watcher({ store, normalizer: norm, adapter, root: tmp });
    await watcher.start();
    await new Promise((r) => setTimeout(r, 500));
    expect(store.listSessions()).toHaveLength(1);
    await watcher.stop();
  });
});
