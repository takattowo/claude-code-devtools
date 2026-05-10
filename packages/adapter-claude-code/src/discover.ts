import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AdapterDiscoveryResult } from '@cli-talker/core';

export const claudeProjectsRoot = (): string =>
  path.join(os.homedir(), '.claude', 'projects');

export const decodeProjectDir = (encoded: string): string => {
  const stripped = encoded.startsWith('-') ? encoded.slice(1) : encoded;
  return '/' + stripped.replace(/-/g, '/');
};

export const discover = async (root: string = claudeProjectsRoot()): Promise<AdapterDiscoveryResult[]> => {
  let dirents: import('node:fs').Dirent[];
  try {
    dirents = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: AdapterDiscoveryResult[] = [];
  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const projectDir = path.join(root, d.name);
    const cwd = decodeProjectDir(d.name);
    let files: import('node:fs').Dirent[];
    try {
      files = await fs.readdir(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
      const filePath = path.join(projectDir, f.name);
      const sessionId = f.name.replace(/\.jsonl$/, '');
      const stat = await fs.stat(filePath);
      out.push({ sessionId, filePath, cwd, startedAt: stat.birthtimeMs || stat.mtimeMs });
    }
  }
  return out;
};
