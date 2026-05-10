import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  platform: 'node',
  clean: true,
  splitting: false,
  sourcemap: false,
  shims: true,
  dts: false,
  noExternal: [
    '@cli-talker/core',
    '@cli-talker/adapter-claude-code',
    '@cli-talker/server',
  ],
  external: [
    'better-sqlite3',
    'fastify',
    '@fastify/static',
    '@fastify/websocket',
    'chokidar',
    'commander',
    'open',
  ],
});
