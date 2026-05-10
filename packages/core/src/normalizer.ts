import type { Store } from './db/store.js';
import type { AdapterEvent } from './types.js';

type Listener = (e: AdapterEvent) => void;

export class Normalizer {
  private listeners = new Map<string, Set<Listener>>();

  constructor(private readonly store: Store) {}

  apply(event: AdapterEvent): void {
    switch (event.type) {
      case 'session-start':
        this.store.upsertSession(event.session);
        break;
      case 'turn-start':
        this.store.insertTurn({
          ...event.turn,
          tokens: event.turn.tokens ?? { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
          endedAt: event.turn.endedAt ?? event.turn.startedAt,
        });
        break;
      case 'tool-call':
        this.store.upsertToolCall(event.call);
        break;
      case 'turn-end':
        break;
      case 'session-end': {
        const s = this.store.getSession(event.sessionId);
        if (s) {
          this.store.upsertSession({ ...s, status: 'ended', endedAt: event.endedAt });
        }
        break;
      }
      case 'context-snapshot':
      case 'adapter-error':
        break;
    }
    this.broadcast(event);
  }

  subscribe(sessionId: string, fn: Listener): () => void {
    let set = this.listeners.get(sessionId);
    if (!set) {
      set = new Set();
      this.listeners.set(sessionId, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  private broadcast(event: AdapterEvent): void {
    const sid = sessionIdFor(event);
    if (!sid) return;
    const set = this.listeners.get(sid);
    if (!set) return;
    for (const fn of set) {
      try { fn(event); } catch { /* swallow */ }
    }
  }
}

const sessionIdFor = (e: AdapterEvent): string | null => {
  switch (e.type) {
    case 'session-start': return e.session.id;
    case 'turn-start': return e.turn.sessionId;
    case 'tool-call': return e.call.sessionId;
    case 'turn-end': return null;
    case 'session-end': return e.sessionId;
    case 'context-snapshot': return null;
    case 'adapter-error': return e.sessionId;
  }
};
