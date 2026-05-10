import { cp, rm, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, '..');

const publicSrc = path.resolve(cliRoot, '..', 'server', 'public');
const publicDest = path.resolve(cliRoot, 'public');
try {
  await stat(publicSrc);
} catch {
  console.error(`copy-assets: missing ${publicSrc}\n  run "pnpm --filter @cli-talker/web build" first`);
  process.exit(1);
}
await rm(publicDest, { recursive: true, force: true });
await cp(publicSrc, publicDest, { recursive: true });
console.log(`copy-assets: ${publicSrc} -> ${publicDest}`);

const schemaSrc = path.resolve(cliRoot, '..', 'core', 'src', 'db', 'schema.sql');
const schemaDest = path.resolve(cliRoot, 'dist', 'schema.sql');
await copyFile(schemaSrc, schemaDest);
console.log(`copy-assets: ${schemaSrc} -> ${schemaDest}`);
