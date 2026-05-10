import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DashboardSummary, HookEvent, Session, SessionFilter, ToolCall, TokenUsage, Turn } from '../types.js';
import { computeCostUsd } from '../pricing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

const splitStatements = (sql: string): string[] =>
  sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter((s) => s.length > 0);

const initSchema = (db: Database.Database, sql: string): void => {
  const stmts = splitStatements(sql);
  const tx = db.transaction(() => {
    for (const stmt of stmts) {
      db.prepare(stmt).run();
    }
  });
  tx();
};

const sessionRow = (r: Record<string, unknown>): Session => ({
  id: r.id as string,
  adapter: r.adapter as string,
  cwd: r.cwd as string,
  startedAt: r.started_at as number,
  endedAt: (r.ended_at as number | null) ?? null,
  model: r.model as string,
  status: r.status as Session['status'],
  meta: JSON.parse((r.meta as string) ?? '{}'),
});

const turnRow = (r: Record<string, unknown>): Turn => ({
  id: r.id as string,
  sessionId: r.session_id as string,
  index: r.idx as number,
  role: r.role as Turn['role'],
  startedAt: r.started_at as number,
  endedAt: r.ended_at as number,
  text: (r.text as string | null) ?? null,
  tokens: {
    input: r.tokens_input as number,
    output: r.tokens_output as number,
    cacheRead: r.tokens_cache_read as number,
    cacheCreate: r.tokens_cache_create as number,
  },
  parentTurnId: (r.parent_turn_id as string | null) ?? null,
});

const toolCallRow = (r: Record<string, unknown>): ToolCall => ({
  id: r.id as string,
  turnId: r.turn_id as string,
  sessionId: r.session_id as string,
  index: r.idx as number,
  name: r.name as string,
  input: r.input ? JSON.parse(r.input as string) : null,
  output: (r.output as string | null) ?? null,
  status: r.status as ToolCall['status'],
  startedAt: r.started_at as number,
  endedAt: (r.ended_at as number | null) ?? null,
  durationMs: (r.duration_ms as number | null) ?? null,
  errorMessage: (r.error_message as string | null) ?? null,
  filePath: (r.file_path as string | null) ?? null,
});

export class Store {
  private constructor(private readonly db: Database.Database) {
    initSchema(db, readFileSync(SCHEMA_PATH, 'utf8'));
  }

  static open(filePath: string): Store {
    return new Store(new Database(filePath));
  }

  static openInMemory(): Store {
    return new Store(new Database(':memory:'));
  }

  close(): void {
    this.db.close();
  }

  upsertSession(s: Session): void {
    this.db.prepare(`
      INSERT INTO sessions (id, adapter, cwd, started_at, ended_at, model, status, meta)
      VALUES (@id, @adapter, @cwd, @startedAt, @endedAt, @model, @status, @meta)
      ON CONFLICT(id) DO UPDATE SET
        ended_at = excluded.ended_at,
        model = excluded.model,
        status = excluded.status,
        meta = excluded.meta
    `).run({
      id: s.id,
      adapter: s.adapter,
      cwd: s.cwd,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      model: s.model,
      status: s.status,
      meta: JSON.stringify(s.meta ?? {}),
    });
  }

  insertTurn(t: Turn): void {
    this.db.prepare(`
      INSERT INTO turns (id, session_id, idx, role, started_at, ended_at, text,
        tokens_input, tokens_output, tokens_cache_read, tokens_cache_create, parent_turn_id)
      VALUES (@id, @sessionId, @idx, @role, @startedAt, @endedAt, @text,
        @ti, @tout, @tcr, @tcc, @parent)
      ON CONFLICT(id) DO UPDATE SET
        ended_at = excluded.ended_at,
        text = excluded.text,
        tokens_input = excluded.tokens_input,
        tokens_output = excluded.tokens_output,
        tokens_cache_read = excluded.tokens_cache_read,
        tokens_cache_create = excluded.tokens_cache_create
    `).run({
      id: t.id,
      sessionId: t.sessionId,
      idx: t.index,
      role: t.role,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      text: t.text,
      ti: t.tokens.input,
      tout: t.tokens.output,
      tcr: t.tokens.cacheRead,
      tcc: t.tokens.cacheCreate,
      parent: t.parentTurnId,
    });
  }

  upsertToolCall(c: ToolCall): void {
    const existing = this.db.prepare('SELECT id FROM tool_calls WHERE id = ?').get(c.id);
    if (existing) {
      this.db.prepare(`
        UPDATE tool_calls SET
          output = COALESCE(@output, output),
          status = CASE WHEN @status = 'pending' THEN status ELSE @status END,
          ended_at = COALESCE(@endedAt, ended_at),
          duration_ms = COALESCE(@durationMs, duration_ms),
          error_message = COALESCE(@errorMessage, error_message)
        WHERE id = @id
      `).run({
        id: c.id,
        output: c.output,
        status: c.status,
        endedAt: c.endedAt,
        durationMs: c.durationMs,
        errorMessage: c.errorMessage,
      });
      return;
    }
    this.db.prepare(`
      INSERT INTO tool_calls (id, turn_id, session_id, idx, name, input, output, status,
        started_at, ended_at, duration_ms, error_message, file_path)
      VALUES (@id, @turnId, @sessionId, @idx, @name, @input, @output, @status,
        @startedAt, @endedAt, @durationMs, @errorMessage, @filePath)
    `).run({
      id: c.id,
      turnId: c.turnId,
      sessionId: c.sessionId,
      idx: c.index,
      name: c.name,
      input: c.input === undefined ? null : JSON.stringify(c.input),
      output: c.output,
      status: c.status,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationMs: c.durationMs,
      errorMessage: c.errorMessage,
      filePath: c.filePath,
    });
  }

  listSessions(): Session[] {
    return (this.db.prepare('SELECT * FROM sessions ORDER BY started_at DESC').all() as Record<string, unknown>[]).map(sessionRow);
  }

  findSessions(filter: SessionFilter): Session[] {
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.cwd) { where.push("s.cwd LIKE @cwd"); params.cwd = `%${filter.cwd}%`; }
    if (filter.model) { where.push("s.model LIKE @model"); params.model = `%${filter.model}%`; }
    if (filter.status) { where.push("s.status = @status"); params.status = filter.status; }
    if (filter.since != null) { where.push("s.started_at >= @since"); params.since = filter.since; }
    if (filter.until != null) { where.push("s.started_at <= @until"); params.until = filter.until; }
    if (filter.q) {
      where.push(`(
        s.cwd LIKE @q
        OR EXISTS (SELECT 1 FROM turns t WHERE t.session_id = s.id AND t.text LIKE @q)
        OR EXISTS (SELECT 1 FROM tool_calls tc WHERE tc.session_id = s.id
                   AND (tc.input LIKE @q OR tc.output LIKE @q OR tc.name LIKE @q OR tc.file_path LIKE @q))
      )`);
      params.q = `%${filter.q}%`;
    }
    if (filter.tool) {
      where.push("EXISTS (SELECT 1 FROM tool_calls tc WHERE tc.session_id = s.id AND tc.name = @tool)");
      params.tool = filter.tool;
    }
    if (filter.filePath) {
      where.push("EXISTS (SELECT 1 FROM tool_calls tc WHERE tc.session_id = s.id AND tc.file_path LIKE @filePath)");
      params.filePath = `%${filter.filePath}%`;
    }
    if (filter.hasErrors) {
      where.push("EXISTS (SELECT 1 FROM tool_calls tc WHERE tc.session_id = s.id AND tc.status = 'error')");
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 1000) : 500;
    const offset = filter.offset && filter.offset > 0 ? filter.offset : 0;
    const sql = `SELECT s.* FROM sessions s ${whereClause} ORDER BY s.started_at DESC LIMIT ${limit} OFFSET ${offset}`;
    return (this.db.prepare(sql).all(params) as Record<string, unknown>[]).map(sessionRow);
  }

  aggregateDashboard(since: number | null, until: number | null): DashboardSummary {
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (since != null) { where.push('s.started_at >= @since'); params.since = since; }
    if (until != null) { where.push('s.started_at <= @until'); params.until = until; }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sessions = (this.db.prepare(`SELECT s.* FROM sessions s ${w}`).all(params) as Record<string, unknown>[]).map(sessionRow);
    const sessionIds = sessions.map((s) => s.id);

    const empty: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
    if (sessionIds.length === 0) {
      return {
        range: { since, until },
        counts: { sessions: 0, turns: 0, toolCalls: 0, errors: 0 },
        tokens: empty,
        cacheHitRate: 0,
        costUsd: 0,
        costByModel: [],
        topTools: [],
        topFiles: [],
      };
    }

    const placeholders = sessionIds.map((_, i) => `@s${i}`).join(',');
    const idParams: Record<string, unknown> = {};
    sessionIds.forEach((id, i) => { idParams[`s${i}`] = id; });

    const turnAgg = this.db.prepare(`
      SELECT COUNT(*) AS c,
        COALESCE(SUM(tokens_input),0) AS ti,
        COALESCE(SUM(tokens_output),0) AS tout,
        COALESCE(SUM(tokens_cache_read),0) AS tcr,
        COALESCE(SUM(tokens_cache_create),0) AS tcc
      FROM turns WHERE session_id IN (${placeholders})
    `).get(idParams) as { c: number; ti: number; tout: number; tcr: number; tcc: number };

    const callAgg = this.db.prepare(`
      SELECT COUNT(*) AS c,
        SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS errs
      FROM tool_calls WHERE session_id IN (${placeholders})
    `).get(idParams) as { c: number; errs: number };

    const tokens: TokenUsage = {
      input: turnAgg.ti, output: turnAgg.tout,
      cacheRead: turnAgg.tcr, cacheCreate: turnAgg.tcc,
    };
    const cacheHitRate = tokens.cacheRead + tokens.input > 0
      ? tokens.cacheRead / (tokens.cacheRead + tokens.input) : 0;

    const perSessionTokens = this.db.prepare(`
      SELECT session_id,
        COALESCE(SUM(tokens_input),0) AS ti,
        COALESCE(SUM(tokens_output),0) AS tout,
        COALESCE(SUM(tokens_cache_read),0) AS tcr,
        COALESCE(SUM(tokens_cache_create),0) AS tcc
      FROM turns WHERE session_id IN (${placeholders})
      GROUP BY session_id
    `).all(idParams) as Array<{ session_id: string; ti: number; tout: number; tcr: number; tcc: number }>;

    const modelAcc = new Map<string, { tokens: TokenUsage; costUsd: number }>();
    for (const s of sessions) {
      const row = perSessionTokens.find((r) => r.session_id === s.id);
      const t: TokenUsage = row
        ? { input: row.ti, output: row.tout, cacheRead: row.tcr, cacheCreate: row.tcc }
        : { ...empty };
      const cost = computeCostUsd(s.model, t);
      const cur = modelAcc.get(s.model) ?? { tokens: { ...empty }, costUsd: 0 };
      cur.tokens.input += t.input;
      cur.tokens.output += t.output;
      cur.tokens.cacheRead += t.cacheRead;
      cur.tokens.cacheCreate += t.cacheCreate;
      cur.costUsd += cost;
      modelAcc.set(s.model, cur);
    }
    const costByModel = Array.from(modelAcc.entries())
      .map(([model, v]) => ({ model, tokens: v.tokens, costUsd: v.costUsd }))
      .sort((a, b) => b.costUsd - a.costUsd);
    const totalCost = costByModel.reduce((sum, m) => sum + m.costUsd, 0);

    const topTools = this.db.prepare(`
      SELECT name, COUNT(*) AS count FROM tool_calls
      WHERE session_id IN (${placeholders})
      GROUP BY name ORDER BY count DESC LIMIT 10
    `).all(idParams) as Array<{ name: string; count: number }>;

    const topFiles = this.db.prepare(`
      SELECT file_path AS filePath, COUNT(*) AS count FROM tool_calls
      WHERE session_id IN (${placeholders}) AND file_path IS NOT NULL
      GROUP BY file_path ORDER BY count DESC LIMIT 10
    `).all(idParams) as Array<{ filePath: string; count: number }>;

    return {
      range: { since, until },
      counts: {
        sessions: sessions.length,
        turns: turnAgg.c,
        toolCalls: callAgg.c,
        errors: callAgg.errs ?? 0,
      },
      tokens,
      cacheHitRate,
      costUsd: totalCost,
      costByModel,
      topTools,
      topFiles,
    };
  }

  getSession(id: string): Session | null {
    const r = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return r ? sessionRow(r) : null;
  }

  listTurns(sessionId: string): Turn[] {
    return (this.db.prepare('SELECT * FROM turns WHERE session_id = ? ORDER BY idx ASC').all(sessionId) as Record<string, unknown>[]).map(turnRow);
  }

  listToolCalls(sessionId: string): ToolCall[] {
    return (this.db.prepare('SELECT * FROM tool_calls WHERE session_id = ? ORDER BY started_at ASC').all(sessionId) as Record<string, unknown>[]).map(toolCallRow);
  }

  insertHookEvent(e: HookEvent): number {
    const info = this.db.prepare(`
      INSERT INTO hook_events (session_id, event, payload, ts)
      VALUES (@sessionId, @event, @payload, @ts)
    `).run({
      sessionId: e.sessionId,
      event: e.event,
      payload: JSON.stringify(e.payload ?? {}),
      ts: e.ts,
    });
    return Number(info.lastInsertRowid);
  }

  listHookEvents(sessionId: string | null, limit = 200): HookEvent[] {
    const rows = sessionId
      ? this.db.prepare(`
          SELECT * FROM hook_events WHERE session_id = ?
          ORDER BY ts DESC LIMIT ?
        `).all(sessionId, limit) as Record<string, unknown>[]
      : this.db.prepare(`
          SELECT * FROM hook_events ORDER BY ts DESC LIMIT ?
        `).all(limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as number,
      sessionId: (r.session_id as string | null) ?? null,
      event: r.event as string,
      payload: JSON.parse((r.payload as string) ?? '{}'),
      ts: r.ts as number,
    }));
  }

  setFileOffset(filePath: string, offset: number): void {
    this.db.prepare(`
      INSERT INTO file_offsets (file_path, offset_bytes, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET offset_bytes = excluded.offset_bytes, updated_at = excluded.updated_at
    `).run(filePath, offset, Date.now());
  }

  getFileOffset(filePath: string): number {
    const r = this.db.prepare('SELECT offset_bytes FROM file_offsets WHERE file_path = ?').get(filePath) as { offset_bytes: number } | undefined;
    return r?.offset_bytes ?? 0;
  }
}
