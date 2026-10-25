import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync, inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { crc32, walletIcon, zipFiles } from './wallet-artifacts.mjs';
import { sourceFiles, SOURCE_FILES } from './wallet-source.mjs';
import { Script } from 'node:vm';

function readZip(bytes) {
  const files = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8),
      crc = bytes.readUInt32LE(offset + 14),
      length = bytes.readUInt32LE(offset + 18),
      rawLength = bytes.readUInt32LE(offset + 22),
      nameLength = bytes.readUInt16LE(offset + 26),
      extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength,
      compressed = bytes.subarray(start, start + length);
    assert.equal(method, 8);
    const raw = inflateRawSync(compressed);
    assert.equal(raw.length, rawLength);
    assert.equal(crc32(raw), crc);
    files.set(name, raw);
    offset = start + length;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
  assert.equal(bytes.readUInt16LE(bytes.length - 12), files.size);
  return files;
}
test('ZIP uses portable raw DEFLATE, correct CRCs and safe deterministic entries', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  const files = new Map([
    ['manifest.json', Buffer.from('{"manifest_version":3}')],
    ['help.txt', Buffer.from('Проверка архива')],
  ]);
  assert.deepEqual(
    [...readZip(zipFiles(files))],
    [...files].sort(([a], [b]) => a.localeCompare(b)),
  );
  assert.deepEqual(zipFiles(files), zipFiles(files));
  assert.throws(() => zipFiles(new Map([['../prod.env', Buffer.from('bad')]])), /Unsafe archive/);
});
test('icons are valid RGBA PNGs with the requested dimensions and valid chunks', () => {
  for (const size of [16, 32, 48, 128]) {
    const bytes = walletIcon(size);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
    let offset = 8;
    const idat = [];
    while (offset < bytes.length) {
      const length = bytes.readUInt32BE(offset),
        type = bytes.subarray(offset + 4, offset + 8),
        data = bytes.subarray(offset + 8, offset + 8 + length);
      assert.equal(bytes.readUInt32BE(offset + 8 + length), crc32(Buffer.concat([type, data])));
      if (type.toString() === 'IDAT') idat.push(data);
      offset += length + 12;
    }
    assert.equal(inflateSync(Buffer.concat(idat)).length, size * (size * 4 + 1));
  }
});
test('source release contains only allowlisted files and a standalone toolchain', async () => {
  const { files, version } = await sourceFiles(new URL('../', import.meta.url));
  assert.equal(new Set(SOURCE_FILES).size, SOURCE_FILES.length);
  assert.ok(
    ![...files.keys()].some((name) =>
      /(?:^|\/)(?:prod\.env|mcp|node_modules|\.codex|test-results|dist)(?:\/|$)|\.(?:env|csv|tsv|har|pem|key|webm)$/.test(
        name,
      ),
    ),
  );
  const pkg = JSON.parse(files.get('package.json')),
    lock = JSON.parse(files.get('package-lock.json'));
  assert.equal(pkg.version, version);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.scripts['mcp:etoro'], undefined);
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ['@playwright/test', 'prettier']);
  assert.equal(pkg.scripts['package:wallet:source'], 'node scripts/package-wallet-source.mjs');
  assert.equal(
    Object.keys(lock.packages).some((path) => /mcp|express|undici/.test(path)),
    false,
  );
  for (const name of Object.keys(pkg.devDependencies))
    assert.ok(lock.packages[`node_modules/${name}`]);
  assert.deepEqual([...readZip(zipFiles(files)).keys()].sort(), [...files.keys()].sort());
  for (const [path, bytes] of files) {
    if (path.endsWith('.png')) {
      assert.deepEqual(
        bytes.subarray(0, 8),
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        `Invalid public PNG: ${path}`,
      );
      continue;
    }
    const text = bytes.toString('utf8');
    assert.deepEqual(Buffer.from(text), bytes, `Invalid UTF-8: ${path}`);
    assert.ok(!text.includes('\uFFFD'), `Replacement character: ${path}`);
  }
});

test('release archive has an MV3 manifest, only expected files and matching checksums', async () => {
  const root = new URL('../dist/', import.meta.url),
    archive = await readFile(new URL('etoro-wallet-search-extension.zip', root));
  const files = readZip(archive);
  assert.deepEqual(
    [...files.keys()].sort(),
    [
      'INSTALL.ru.md',
      'INSTALL.de.md',
      'export-relay.js',
      'export-worker.js',
      'help.css',
      'help.html',
      'help.js',
      'i18n.js',
      'policy.js',
      'icons/icon128.png',
      'icons/icon16.png',
      'icons/icon32.png',
      'icons/icon48.png',
      'manifest.json',
      'popup.css',
      'popup.html',
      'popup.js',
      'wallet-search.js',
    ].sort(),
  );
  const manifest = JSON.parse(files.get('manifest.json'));
  for (const path of ['wallet-search.js', 'export-relay.js', 'export-worker.js'])
    assert.doesNotThrow(() => new Script(files.get(path).toString('utf8'), { filename: path }));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(
    manifest.version,
    JSON.parse(
      await readFile(new URL('../wallet-search/extension/manifest.json', import.meta.url), 'utf8'),
    ).version,
  );
  assert.deepEqual(manifest.permissions, ['scripting']);
  assert.deepEqual(manifest.host_permissions, [
    'https://www.etoro.com/*',
    'https://prodfileexportwe.blob.core.windows.net/*',
  ]);
  assert.deepEqual(manifest.optional_host_permissions, ['https://*.blob.core.windows.net/*']);
  assert.equal(manifest.background.service_worker, 'export-worker.js');
  const main = manifest.content_scripts.find((entry) => entry.world === 'MAIN'),
    relay = manifest.content_scripts.find((entry) => entry.world === 'ISOLATED');
  assert.equal(main.all_frames, false);
  assert.deepEqual(main.js, ['wallet-search.js']);
  assert.equal(relay.all_frames, false);
  assert.deepEqual(relay.js, ['export-relay.js']);
  const checksums = await readFile(new URL('SHA256SUMS.txt', root), 'utf8');
  assert.ok(checksums.includes(createHash('sha256').update(archive).digest('hex')));
  const runtime = await readFile(new URL('chrome-extension/wallet-search.js', root));
  assert.deepEqual(runtime, files.get('wallet-search.js'));
  for (const directory of ['chrome-extension', 'etoro-wallet-search-extension'])
    for (const [name, data] of files)
      assert.deepEqual(
        await readFile(new URL(`${directory}/${name}`, root)),
        data,
        `${directory}/${name}`,
      );
  const userscript = await readFile(new URL('etoro-wallet-search.user.js', root), 'utf8');
  assert.ok(userscript.endsWith(runtime.toString()));
  assert.ok(userscript.includes(`// @version      ${manifest.version}`));
  assert.ok(userscript.includes('// @grant        GM_xmlhttpRequest'));
  assert.ok(userscript.includes('// @connect      blob.core.windows.net'));
  assert.ok(!userscript.includes('// @connect      *'));
  assert.deepEqual(
    await readFile(new URL(`etoro-wallet-search-extension-${manifest.version}.zip`, root)),
    archive,
  );
});
