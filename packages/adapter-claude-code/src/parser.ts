import type { AdapterEvent, Session, ToolCall, Turn } from '@cli-talker/core';

export interface ParseLineState {
  sessionId: string | null;
}

export interface ParseLineResult {
  events: AdapterEvent[];
  newSessionId: string | null;
}

interface RawLine {
  type?: string;
  sessionId?: string;
  cwd?: string;
  uuid?: string;
  parentUuid?: string | null;
  timestamp?: string;
  message?: {
    role?: string;
    model?: string;
    content?: unknown;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    stop_reason?: string;
  };
}

const filePathFromInput = (toolName: string, input: unknown): string | null => {
  if (typeof input !== 'object' || input === null) return null;
  const i = input as Record<string, unknown>;
  if (typeof i.file_path === 'string') return i.file_path;
  if (typeof i.path === 'string') return i.path;
  if (toolName === 'Bash' && typeof i.command === 'string') return null;
  return null;
};

const turnSeqIndex = new Map<string, number>();
const sessionModel = new Map<string, string>();

export const resetParserState = (): void => {
  turnSeqIndex.clear();
  sessionModel.clear();
};

const nextTurnIndex = (sessionId: string): number => {
  const cur = turnSeqIndex.get(sessionId) ?? -1;
  const next = cur + 1;
  turnSeqIndex.set(sessionId, next);
  return next;
};

export const parseLine = (line: string, state: ParseLineState): ParseLineResult => {
  if (!line || line.trim() === '') {
    return { events: [], newSessionId: state.sessionId };
  }

  let raw: RawLine;
  try {
    raw = JSON.parse(line) as RawLine;
  } catch (err) {
    return {
      events: [{
        type: 'adapter-error',
        sessionId: state.sessionId,
        path: '',
        message: `JSON parse failed: ${(err as Error).message}`,
      }],
      newSessionId: state.sessionId,
    };
  }

  if (!raw.type) return { events: [], newSessionId: state.sessionId };

  const events: AdapterEvent[] = [];
  let sessionId = state.sessionId;

  if ((raw.type === 'user' || raw.type === 'assistant') && raw.sessionId && raw.cwd) {
    const incomingModel = raw.message?.model ?? null;
    const knownModel = sessionModel.get(raw.sessionId);
    const firstSighting = sessionId !== raw.sessionId;
    const modelUpgrade = !!incomingModel && knownModel !== incomingModel;

    if (firstSighting || modelUpgrade) {
      const session: Session = {
        id: raw.sessionId,
        adapter: 'claude-code',
        cwd: raw.cwd,
        startedAt: raw.timestamp ? Date.parse(raw.timestamp) : Date.now(),
        endedAt: null,
        model: incomingModel ?? knownModel ?? 'unknown',
        status: 'active',
        meta: {},
      };
      events.push({ type: 'session-start', session });
      if (incomingModel) sessionModel.set(raw.sessionId, incomingModel);
      else if (!knownModel) sessionModel.set(raw.sessionId, 'unknown');
      if (firstSighting) sessionId = raw.sessionId;
    }
  }

  if (!sessionId) return { events, newSessionId: sessionId };
  const ts = raw.timestamp ? Date.parse(raw.timestamp) : Date.now();

  if (raw.type === 'user') {
    const content = raw.message?.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === 'object' && part !== null && (part as { type?: string }).type === 'tool_result') {
          const tr = part as { tool_use_id?: string; content?: unknown; is_error?: boolean };
          const text = typeof tr.content === 'string'
            ? tr.content
            : Array.isArray(tr.content)
              ? tr.content.map((c: unknown) => typeof c === 'object' && c && 'text' in c ? String((c as { text: unknown }).text) : '').join('')
              : JSON.stringify(tr.content ?? null);
          events.push({
            type: 'tool-call',
            call: {
              id: tr.tool_use_id ?? 'unknown',
              turnId: '',
              sessionId,
              index: 0,
              name: '',
              input: undefined,
              output: text,
              status: tr.is_error ? 'error' : 'success',
              startedAt: ts,
              endedAt: ts,
              durationMs: null,
              errorMessage: tr.is_error ? text : null,
              filePath: null,
            },
          });
        }
      }
      return { events, newSessionId: sessionId };
    }
    const turnId = raw.uuid ?? `${sessionId}-${ts}`;
    const idx = nextTurnIndex(sessionId);
    const turn: Turn = {
      id: turnId,
      sessionId,
      index: idx,
      role: 'user',
      startedAt: ts,
      endedAt: ts,
      text: typeof content === 'string' ? content : JSON.stringify(content ?? null),
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
      parentTurnId: raw.parentUuid ?? null,
    };
    events.push({ type: 'turn-start', turn });
    events.push({
      type: 'turn-end',
      turnId,
      endedAt: ts,
      tokens: turn.tokens,
    });
  }

  if (raw.type === 'assistant') {
    const content = raw.message?.content;
    const turnId = raw.uuid ?? `${sessionId}-${ts}`;
    const idx = nextTurnIndex(sessionId);
    const text = Array.isArray(content)
      ? content.filter((c: unknown) => typeof c === 'object' && c && (c as { type?: string }).type === 'text')
              .map((c: unknown) => String((c as { text: unknown }).text))
              .join('')
      : null;
    const usage = raw.message?.usage ?? {};
    const tokens = {
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
      cacheCreate: usage.cache_creation_input_tokens ?? 0,
    };
    const turn: Turn = {
      id: turnId,
      sessionId,
      index: idx,
      role: 'assistant',
      startedAt: ts,
      endedAt: ts,
      text,
      tokens,
      parentTurnId: raw.parentUuid ?? null,
    };
    events.push({ type: 'turn-start', turn });

    if (Array.isArray(content)) {
      let toolIdx = 0;
      for (const part of content) {
        if (typeof part === 'object' && part !== null && (part as { type?: string }).type === 'tool_use') {
          const tu = part as { id?: string; name?: string; input?: unknown };
          const call: ToolCall = {
            id: tu.id ?? `${turnId}-tu-${toolIdx}`,
            turnId,
            sessionId,
            index: toolIdx++,
            name: tu.name ?? 'unknown',
            input: tu.input,
            output: null,
            status: 'pending',
            startedAt: ts,
            endedAt: null,
            durationMs: null,
            errorMessage: null,
            filePath: filePathFromInput(tu.name ?? '', tu.input),
          };
          events.push({ type: 'tool-call', call });
        }
      }
    }
    events.push({ type: 'turn-end', turnId, endedAt: ts, tokens });
  }

  return { events, newSessionId: sessionId };
};
