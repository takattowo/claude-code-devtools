#!/usr/bin/env node
import { Command } from 'commander';
import open from 'open';
import { start } from '@cli-talker/server';

const program = new Command();
program
  .name('cli-talker')
  .description('Agent DevTools for Claude Code')
  .option('--port <port>', 'preferred port', (v) => Number(v), 7777)
  .option('--host <host>', 'bind host', '127.0.0.1')
  .option('--no-open', 'do not auto-open the browser')
  .action(async (opts: { port: number; host: string; open?: boolean }) => {
    const server = await start({ port: opts.port, host: opts.host });
    process.stdout.write(`cli-talker listening at ${server.url}\n`);
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
