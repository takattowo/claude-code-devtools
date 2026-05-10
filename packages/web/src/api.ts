import type {
  DashboardSummary, HeatmapEntry, Session, SessionFilter, SessionStats, ToolCall, Turn,
} from './types.js';

const get = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
};

const buildQuery = (params: Record<string, string | number | boolean | undefined>): string => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '' || v === false) continue;
    usp.set(k, v === true ? '1' : String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  listSessions: (filter?: SessionFilter) => {
    const qs = filter ? buildQuery({
      cwd: filter.cwd, model: filter.model, status: filter.status,
      since: filter.since, until: filter.until, q: filter.q,
      tool: filter.tool, filePath: filter.filePath, hasErrors: filter.hasErrors,
    }) : '';
    return get<{ sessions: Session[] }>(`/api/sessions${qs}`).then((r) => r.sessions);
  },
  getSession: (id: string) => get<{ session: Session }>(`/api/sessions/${id}`).then((r) => r.session),
  listTurns: (id: string) => get<{ turns: Turn[] }>(`/api/sessions/${id}/turns`).then((r) => r.turns),
  listToolCalls: (id: string) => get<{ toolCalls: ToolCall[] }>(`/api/sessions/${id}/tool-calls`).then((r) => r.toolCalls),
  getStats: (id: string) => get<{ stats: SessionStats }>(`/api/sessions/${id}/stats`).then((r) => r.stats),
  getHeatmap: (id: string) => get<{ entries: HeatmapEntry[] }>(`/api/sessions/${id}/heatmap`).then((r) => r.entries),
  getDashboard: (since: number | null, until: number | null) =>
    get<{ summary: DashboardSummary }>(`/api/dashboard${buildQuery({
      since: since ?? undefined, until: until ?? undefined,
    })}`).then((r) => r.summary),
};
