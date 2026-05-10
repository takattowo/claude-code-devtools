import { promises as fs } from 'node:fs';
import type { AdapterEvent } from '@cli-talker/core';
import { parseLine } from './parser.js';

export interface ReaderState {
  sessionId: string | null;
}

export interface ReadChunkResult {
  events: AdapterEvent[];
  newOffset: number;
  state: ReaderState;
}

export const readChunk = async (
  filePath: string,
  fromOffset: number,
  state: ReaderState,
): Promise<ReadChunkResult> => {
  const stat = await fs.stat(filePath);
  if (stat.size < fromOffset) {
    fromOffset = 0;
  }
  if (stat.size === fromOffset) {
    return { events: [], newOffset: fromOffset, state };
  }

  const fh = await fs.open(filePath, 'r');
  try {
    const length = stat.size - fromOffset;
    const buf = Buffer.alloc(length);
    await fh.read(buf, 0, length, fromOffset);
    const text = buf.toString('utf8');
    const lastNewline = text.lastIndexOf('\n');
    if (lastNewline === -1) {
      return { events: [], newOffset: fromOffset, state };
    }
    const usable = text.slice(0, lastNewline);
    const consumedBytes = Buffer.byteLength(usable + '\n');
    const events: AdapterEvent[] = [];
    let s: ReaderState = { ...state };

    for (const line of usable.split('\n')) {
      if (!line) continue;
      const r = parseLine(line, s);
      events.push(...r.events);
      s = { sessionId: r.newSessionId };
    }
    return { events, newOffset: fromOffset + consumedBytes, state: s };
  } finally {
    await fh.close();
  }
};
