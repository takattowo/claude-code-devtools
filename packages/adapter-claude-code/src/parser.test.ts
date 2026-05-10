import { describe, it, expect } from 'vitest';
import { parseLine, resetParserState } from './parser.js';

describe('parseLine', () => {
  it('returns no events for empty lines', () => {
    expect(parseLine('', { sessionId: null })).toEqual({ events: [], newSessionId: null });
  });

  it('parses a user message into a turn-start + turn-end', () => {
    const line = JSON.stringify({
      parentUuid: null, isSidechain: false, userType: 'external',
      cwd: '/tmp', sessionId: 's1', version: '1', gitBranch: 'main',
      type: 'user', message: { role: 'user', content: 'hi' },
      uuid: 'u1', timestamp: '2026-05-10T10:00:00.000Z',
    });
    const result = parseLine(line, { sessionId: null });
    expect(result.newSessionId).toBe('s1');
    expect(result.events.some(e => e.type === 'session-start')).toBe(true);
    expect(result.events.some(e => e.type === 'turn-start')).toBe(true);
  });

  it('parses an assistant message with tool_use into turn + tool-call events', () => {
    const line = JSON.stringify({
      parentUuid: 'u1', isSidechain: false, userType: 'external',
      cwd: '/tmp', sessionId: 's1', version: '1', gitBranch: 'main',
      type: 'assistant',
      message: {
        id: 'm1', type: 'message', role: 'assistant', model: 'claude-opus-4-7',
        content: [
          { type: 'text', text: 'reading' },
          { type: 'tool_use', id: 'tu1', name: 'Read', input: { file_path: '/x.ts' } },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 },
      },
      uuid: 'u2', timestamp: '2026-05-10T10:00:01.000Z',
    });
    const result = parseLine(line, { sessionId: 's1' });
    const toolCall = result.events.find(e => e.type === 'tool-call');
    expect(toolCall).toBeDefined();
    if (toolCall && toolCall.type === 'tool-call') {
      expect(toolCall.call.name).toBe('Read');
      expect(toolCall.call.filePath).toBe('/x.ts');
      expect(toolCall.call.status).toBe('pending');
    }
  });

  it('parses a tool_result line and marks the matching tool-call success', () => {
    const line = JSON.stringify({
      parentUuid: 'u2', isSidechain: false, userType: 'external',
      cwd: '/tmp', sessionId: 's1', version: '1', gitBranch: 'main',
      type: 'user',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'file', is_error: false }] },
      uuid: 'u3', timestamp: '2026-05-10T10:00:02.000Z',
    });
    const result = parseLine(line, { sessionId: 's1' });
    const update = result.events.find(e => e.type === 'tool-call');
    expect(update).toBeDefined();
    if (update && update.type === 'tool-call') {
      expect(update.call.status).toBe('success');
      expect(update.call.output).toBe('file');
    }
  });

  it('returns adapter-error for malformed JSON', () => {
    const result = parseLine('{not json', { sessionId: 's1' });
    const err = result.events.find(e => e.type === 'adapter-error');
    expect(err).toBeDefined();
  });

  it('skips unknown line types without crashing', () => {
    const line = JSON.stringify({ type: 'summary', summary: 'x' });
    const result = parseLine(line, { sessionId: 's1' });
    expect(result.events).toEqual([]);
  });

  it('re-emits session-start with model when assistant turn arrives after user-only init', () => {
    resetParserState();
    const userLine = JSON.stringify({
      parentUuid: null, cwd: '/tmp', sessionId: 'sM',
      type: 'user', message: { role: 'user', content: 'hi' },
      uuid: 'u1', timestamp: '2026-05-10T10:00:00.000Z',
    });
    const userResult = parseLine(userLine, { sessionId: null });
    const userStart = userResult.events.find(e => e.type === 'session-start');
    expect(userStart && userStart.type === 'session-start' && userStart.session.model).toBe('unknown');

    const assistantLine = JSON.stringify({
      parentUuid: 'u1', cwd: '/tmp', sessionId: 'sM',
      type: 'assistant',
      message: {
        role: 'assistant', model: 'claude-opus-4-7',
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 1, output_tokens: 2, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
      uuid: 'u2', timestamp: '2026-05-10T10:00:01.000Z',
    });
    const result = parseLine(assistantLine, { sessionId: 'sM' });
    const upgrade = result.events.find(e => e.type === 'session-start');
    expect(upgrade).toBeDefined();
    if (upgrade && upgrade.type === 'session-start') {
      expect(upgrade.session.model).toBe('claude-opus-4-7');
    }
  });
});
