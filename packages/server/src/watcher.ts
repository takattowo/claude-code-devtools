import chokidar from 'chokidar';
import path from 'node:path';
import type { AgentAdapter, Normalizer, Store } from '@cli-talker/core';

export interface WatcherOptions {
  store: Store;
  normalizer: Normalizer;
  adapter: AgentAdapter;
  root: string;
}

export class Watcher {
  private fsWatcher: chokidar.FSWatcher | null = null;
  private inFlight = new Map<string, Promise<void>>();

  constructor(private readonly opts: WatcherOptions) {}

  async start(): Promise<void> {
    const pattern = path.join(this.opts.root, '*', '*.jsonl').replace(/\\/g, '/');
    this.fsWatcher = chokidar.watch(pattern, {
      awaitWriteFinish: { stabilityThreshold: 50 },
      ignoreInitial: false,
    });
    this.fsWatcher.on('add', (p) => this.process(p));
    this.fsWatcher.on('change', (p) => this.process(p));
    await new Promise<void>((resolve) => this.fsWatcher!.on('ready', resolve));
    // Wait for any initial 'add' events to drain.
    await Promise.all(this.inFlight.values());
  }

  async stop(): Promise<void> {
    if (this.fsWatcher) {
      await this.fsWatcher.close();
      this.fsWatcher = null;
    }
    await Promise.all(this.inFlight.values());
  }

  private process(filePath: string): void {
    const prev = this.inFlight.get(filePath) ?? Promise.resolve();
    const next = prev.then(() => this.processOnce(filePath)).catch(() => undefined);
    this.inFlight.set(filePath, next);
  }

  private async processOnce(filePath: string): Promise<void> {
    const fromOffset = this.opts.store.getFileOffset(filePath);
    const result = await this.opts.adapter.readChunk(filePath, fromOffset);
    for (const event of result.events) {
      this.opts.normalizer.apply(event);
    }
    this.opts.store.setFileOffset(filePath, result.newOffset);
  }
}
