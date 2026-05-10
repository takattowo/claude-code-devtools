export interface Session {
  id: string;
  adapter: string;
  cwd: string;
  startedAt: number;
  endedAt: number | null;
  model: string;
  status: 'active' | 'ended' | 'error';
  meta: Record<string, unknown>;
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
}

export interface Turn {
  id: string;
  sessionId: string;
  index: number;
  role: 'user' | 'assistant' | 'system';
  startedAt: number;
  endedAt: number;
  text: string | null;
  tokens: TokenUsage;
  parentTurnId: string | null;
}

export interface ToolCall {
  id: string;
  turnId: string;
  sessionId: string;
  index: number;
  name: string;
  input: unknown;
  output: string | null;
  status: 'success' | 'error' | 'denied' | 'pending';
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  filePath: string | null;
}

export interface ContextSnapshot {
  id: string;
  turnId: string;
  systemPromptHash: string;
  systemPromptText: string;
  toolsLoaded: string[];
  messagesInContext: number;
  tokensInContext: number;
  cacheBreakpoints: number[];
}

export interface TokenStat {
  sessionId: string;
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  cacheHitRate: number;
  costUsd: number;
}

export interface SessionFilter {
  cwd?: string;
  model?: string;
  status?: string;
  since?: number;
  until?: number;
  q?: string;
  tool?: string;
  filePath?: string;
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
}

export interface DashboardSummary {
  range: { since: number | null; until: number | null };
  counts: { sessions: number; turns: number; toolCalls: number; errors: number };
  tokens: TokenUsage;
  cacheHitRate: number;
  costUsd: number;
  costByModel: Array<{ model: string; costUsd: number; tokens: TokenUsage }>;
  topTools: Array<{ name: string; count: number }>;
  topFiles: Array<{ filePath: string; count: number }>;
}

export interface HookEvent {
  id?: number;
  sessionId: string | null;
  event: string;
  payload: unknown;
  ts: number;
}

export type AdapterEvent =
  | { type: 'session-start'; session: Session }
  | { type: 'turn-start'; turn: Omit<Turn, 'tokens' | 'endedAt'> & { tokens?: TokenUsage; endedAt?: number } }
  | { type: 'tool-call'; call: ToolCall }
  | { type: 'turn-end'; turnId: string; endedAt: number; tokens: TokenUsage }
  | { type: 'session-end'; sessionId: string; endedAt: number }
  | { type: 'context-snapshot'; snap: ContextSnapshot }
  | { type: 'adapter-error'; sessionId: string | null; path: string; message: string };
