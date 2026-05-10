import type { AgentAdapter } from '@cli-talker/core';
import { discover } from './discover.js';
import { readChunk, type ReaderState } from './reader.js';

export const createClaudeCodeAdapter = (): AgentAdapter => {
  const stateByPath = new Map<string, ReaderState>();
  return {
    name: 'claude-code',
    async discover() {
      return discover();
    },
    async readChunk(filePath: string, fromOffset: number) {
      const state = stateByPath.get(filePath) ?? { sessionId: null };
      const r = await readChunk(filePath, fromOffset, state);
      stateByPath.set(filePath, r.state);
      return { events: r.events, newOffset: r.newOffset };
    },
  };
};
