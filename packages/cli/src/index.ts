#!/usr/bin/env node
import { Command } from 'commander';
import open from 'open';
import { start } from '@cli-talker/server';

const collect = (value: string, prev: string[]): string[] => [...prev, value];

const program = new Command();
program
  .name('claude-code-devtools')
  .description('Local web app that visualizes Claude Code sessions.')
  .option('--port <port>', 'preferred port', (v) => Number(v), 7777)
  .option('--host <host>', 'bind host', '127.0.0.1')
  .option('--no-open', 'do not auto-open the browser')
  .option('--redact <pattern>', 'regex to redact from API output (repeatable)', collect, [])
  .option('--no-redact-defaults', 'disable built-in default redaction patterns')
  .action(async (opts: {
    port: number;
    host: string;
    open?: boolean;
    redact: string[];
    redactDefaults?: boolean;
  }) => {
    const server = await start({
      port: opts.port,
      host: opts.host,
      redactPatterns: opts.redact,
      redactDefaults: opts.redactDefaults,
    });
    process.stdout.write(`claude-code-devtools listening at ${server.url}\n`);
    if (opts.open !== false) {
      try { await open(server.url); } catch { /* headless ok */ }
    }
    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });
  });

program.parseAsync().catch((e) => {
  process.stderr.write(`error: ${(e as Error).message}\n`);
  process.exit(1);
});
