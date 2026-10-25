import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { walletIcon, zipFiles } from './wallet-artifacts.mjs';
const root = new URL('../', import.meta.url);
const extensionSource = new URL('wallet-search/extension/', root);
const manifest = JSON.parse(await readFile(new URL('manifest.json', extensionSource), 'utf8'));
const core = (await readFile(new URL('wallet-search/core.mjs', root), 'utf8')).replace(
  /^export /gm,
  '',
);
const bundle = (source) =>
  source.replace(/^import \{[^;]+\} from '\.\/[^']+';\r?\n/gm, '').replace(/^export /gm, '');
const transport = bundle(await readFile(new URL('wallet-search/transport.mjs', root), 'utf8'));
const entry = bundle(await readFile(new URL('wallet-search/browser.mjs', root), 'utf8'));
const modules = {};
for (const name of [
  'policy',
  'bridge',
  'bridge-client',
  'data',
  'i18n',
  'layout',
  'native',
  'cache-client',
  'charts',
  'accordion',
  'cache-store',
])
  modules[name] = bundle(await readFile(new URL(`wallet-search/${name}.mjs`, root), 'utf8'));
const metadata = `// ==UserScript==
// @name         eToro Wallet Search
// @namespace    local.etoro.wallet-search
// @version      ${manifest.version}
// @description  Search Wallet transactions with expandable monthly statistics and a local history cache.
// @match        https://www.etoro.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      self
// @connect      prodfileexportwe.blob.core.windows.net
// @connect      blob.core.windows.net
// @sandbox      raw
// @noframes
// ==/UserScript==
`;
const runtime =
  '(() => {\n"use strict";\nconst RELEASE_VERSION=' +
  JSON.stringify(manifest.version) +
  ';\n' +
  [
    core,
    modules.policy,
    transport,
    ...[
      'data',
      'i18n',
      'layout',
      'bridge-client',
      'native',
      'cache-client',
      'charts',
      'accordion',
    ].map((name) => modules[name]),
    entry,
  ].join('\n') +
  '\n})();\n';
const output = metadata + '\n' + runtime;
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/etoro-wallet-search.user.js', root), output, 'utf8');
const files = new Map([['wallet-search.js', Buffer.from(runtime)]]);
files.set(
  'export-worker.js',
  Buffer.from(
    '(() => {\n"use strict";\n' +
      [
        core,
        modules.policy,
        transport,
        modules.data,
        modules['cache-store'],
        modules.bridge,
        await readFile(new URL('export-worker.js', extensionSource), 'utf8'),
      ].join('\n') +
      '\n})();\n',
  ),
);
files.set(
  'export-relay.js',
  Buffer.from(
    '(() => {\n"use strict";\n' +
      modules.policy +
      '\n' +
      (await readFile(new URL('export-relay.js', extensionSource), 'utf8')) +
      '\n})();\n',
  ),
);
files.set('policy.js', await readFile(new URL('wallet-search/policy.mjs', root)));
files.set('i18n.js', await readFile(new URL('wallet-search/i18n.mjs', root)));
for (const path of [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'help.html',
  'help.css',
  'help.js',
  'INSTALL.ru.md',
  'INSTALL.de.md',
])
  files.set(path, await readFile(new URL(path, extensionSource)));
for (const size of [16, 32, 48, 128]) files.set(`icons/icon${size}.png`, walletIcon(size));
// Keep both advertised unpacked installation paths current on every build.
// Never replace an existing directory belonging to a different extension.
for (const directory of ['dist/chrome-extension/', 'dist/etoro-wallet-search-extension/']) {
  const extensionOutput = new URL(directory, root);
  try {
    const existing = JSON.parse(await readFile(new URL('manifest.json', extensionOutput), 'utf8'));
    if (existing.name !== manifest.name)
      throw new Error(`Unrelated extension directory: ${directory}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const [path, data] of files) {
    const target = new URL(path, extensionOutput);
    await mkdir(new URL('./', target), { recursive: true });
    await writeFile(target, data);
  }
}
const archive = zipFiles(files);
await writeFile(new URL('dist/etoro-wallet-search-extension.zip', root), archive);
const versionedArchive = `etoro-wallet-search-extension-${manifest.version}.zip`;
await writeFile(new URL(`dist/${versionedArchive}`, root), archive);
const checksums = Object.fromEntries(
  [
    ['etoro-wallet-search.user.js', Buffer.from(output)],
    ['etoro-wallet-search-extension.zip', archive],
    [versionedArchive, archive],
  ].map(([name, data]) => [name, createHash('sha256').update(data).digest('hex')]),
);
await writeFile(
  new URL('dist/SHA256SUMS.txt', root),
  Object.entries(checksums)
    .map(([name, hash]) => `${hash}  ${name}`)
    .join('\n') + '\n',
);
console.log(
  `Built Wallet Search ${manifest.version}: userscript, unpacked Chrome extension, ZIP, SHA256SUMS.txt`,
);
