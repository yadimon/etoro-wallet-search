import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sourceFiles } from './wallet-source.mjs';
import { zipFiles } from './wallet-artifacts.mjs';

const root = new URL('../', import.meta.url),
  { files, version } = await sourceFiles(root);
const name = `etoro-wallet-search-source-${version}.zip`,
  archive = zipFiles(files);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL(`dist/${name}`, root), archive);
await writeFile(
  new URL('dist/SHA256SUMS-source.txt', root),
  `${createHash('sha256').update(archive).digest('hex')}  ${name}\n`,
);
console.log(
  `Prepared ${name}: ${files.size} allowlisted files; no MCP, environment files or real-account receipts. No upload performed.`,
);
