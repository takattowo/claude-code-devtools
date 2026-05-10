#!/usr/bin/env node
// Claude Code hook → claude-code-devtools ingest endpoint.
// Reads JSON from stdin, POSTs to http://127.0.0.1:7777/api/ingest/hook.
// Silent on any failure: server may not be running and that's fine.

import { request } from 'node:http';

const PORT = Number(process.env.CLAUDE_DEVTOOLS_PORT ?? 7777);
const HOST = process.env.CLAUDE_DEVTOOLS_HOST ?? '127.0.0.1';
const TIMEOUT_MS = 500;

const readStdin = () =>
  new Promise((resolve) => {
    let buf = '';
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve(buf);
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buf += chunk;
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    // Hard cap: hook events are small and fast.
    setTimeout(finish, 250);
  });

const post = (body) =>
  new Promise((resolve) => {
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = request(
      {
        host: HOST,
        port: PORT,
        path: '/api/ingest/hook',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': data.length,
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve());
        res.on('error', () => resolve());
      },
    );
    req.on('error', () => resolve());
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });
    req.write(data);
    req.end();
  });

const main = async () => {
  const stdin = await readStdin();
  let parsed = null;
  try {
    if (stdin.trim().length > 0) parsed = JSON.parse(stdin);
  } catch {
    parsed = { raw: stdin };
  }
  const argEvent = process.argv[2];
  const event =
    argEvent ||
    (parsed && typeof parsed.hook_event_name === 'string' ? parsed.hook_event_name : 'Unknown');
  const sessionId =
    parsed && typeof parsed.session_id === 'string' ? parsed.session_id : null;
  await post({ event, sessionId, payload: parsed ?? {}, ts: Date.now() });
};

main().finally(() => process.exit(0));
