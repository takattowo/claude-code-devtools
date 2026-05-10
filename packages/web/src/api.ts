import type { HeatmapEntry, Session, SessionStats, ToolCall, Turn } from './types.js';

const get = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
};

export const api = {
  listSessions: () => get<{ sessions: Session[] }>('/api/sessions').then((r) => r.sessions),
  getSession: (id: string) => get<{ session: Session }>(`/api/sessions/${id}`).then((r) => r.session),
  listTurns: (id: string) => get<{ turns: Turn[] }>(`/api/sessions/${id}/turns`).then((r) => r.turns),
  listToolCalls: (id: string) => get<{ toolCalls: ToolCall[] }>(`/api/sessions/${id}/tool-calls`).then((r) => r.toolCalls),
  getStats: (id: string) => get<{ stats: SessionStats }>(`/api/sessions/${id}/stats`).then((r) => r.stats),
  getHeatmap: (id: string) => get<{ entries: HeatmapEntry[] }>(`/api/sessions/${id}/heatmap`).then((r) => r.entries),
};
