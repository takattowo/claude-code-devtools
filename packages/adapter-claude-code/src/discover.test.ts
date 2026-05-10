import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { discover, decodeProjectDir } from './discover.js';

describe('decodeProjectDir', () => {
  it('decodes encoded cwd into real path', () => {
    expect(decodeProjectDir('-tmp-proj')).toBe('/tmp/proj');
  });
});

describe('discover', () => {
  let tmp: string;
  beforeEach(async () => { tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-talker-disc-')); });
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  it('returns [] for missing root', async () => {
    expect(await discover(path.join(tmp, 'nope'))).toEqual([]);
  });

  it('finds session jsonl files', async () => {
    const projectDir = path.join(tmp, '-tmp-proj');
    await fs.mkdir(projectDir, { recursive: true });
    const sessionFile = path.join(projectDir, 's-1.jsonl');
    await fs.writeFile(sessionFile, '');
    const out = await discover(tmp);
    expect(out).toEqual([{
      sessionId: 's-1',
      filePath: sessionFile,
      cwd: '/tmp/proj',
      startedAt: expect.any(Number),
    }]);
  });
});
