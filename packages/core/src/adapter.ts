import type { AdapterEvent } from './types.js';

export interface AdapterDiscoveryResult {
  sessionId: string;
  filePath: string;
  cwd: string;
  startedAt: number;
}

export interface AgentAdapter {
  /** Stable identifier, e.g. "claude-code" */
  readonly name: string;

  /** Find existing session files on disk. */
  discover(): Promise<AdapterDiscoveryResult[]>;

  /**
   * Read everything in the file from `fromOffset` to EOF, parse, return events
   * and the new offset. Safe to call repeatedly. Partial trailing line held back.
   */
  readChunk(filePath: string, fromOffset: number): Promise<{ events: AdapterEvent[]; newOffset: number }>;
}
