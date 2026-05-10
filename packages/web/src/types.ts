export interface Session {
  id: string;
  adapter: string;
  cwd: string;
  startedAt: number;
  endedAt: number | null;
  model: string;
  status: 'active' | 'ended' | 'error';
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

export interface Turn {
  id: string;
  sessionId: string;
  index: number;
  role: 'user' | 'assistant' | 'system';
  startedAt: number;
  endedAt: number;
  text: string | null;
  tokens: { input: number; output: number; cacheRead: number; cacheCreate: number };
  parentTurnId: string | null;
}

export interface SessionStats {
  sessionId: string;
  model: string;
  turnCount: number;
  toolCallCount: number;
  errorCount: number;
  tokens: { input: number; output: number; cacheRead: number; cacheCreate: number };
  cacheHitRate: number;
  costUsd: number;
}

export interface HeatmapEntry {
  filePath: string;
  count: number;
  reads: number;
  writes: number;
  edits: number;
  errors: number;
  lastTouchAt: number;
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
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
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
