import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Session, ToolCall, Turn } from '../types.js';

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
