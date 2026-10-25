import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS } from './core.mjs';
import { exportURL, responseBytes, bytesBase64, base64Bytes, abortable } from './transport.mjs';

test('native export links preserve their signature and reject unsafe URL schemes or wildcard access', () => {
  const file = 'https://prodfileexportwe.blob.core.windows.net/file.tsv?sig=a%2Bb%3D&token=123';
  assert.equal(exportURL(file + '#unused').href, file);
  assert.equal(exportURL('https://www.etoro.com/export.tsv').origin, 'https://www.etoro.com');
  assert.equal(
    exportURL('https://regionalfiles.blob.core.windows.net/file.tsv').hostname,
    'regionalfiles.blob.core.windows.net',
  );
  for (const url of [
    'http://export.example/file.tsv',
    'file:///private.tsv',
    'javascript:alert(1)',
    'https://user:pass@prodfileexportwe.blob.core.windows.net/file.tsv',
    'https://*.example/file.tsv',
    'https://prodfileexportwe.blob.core.windows.net:8080/file.tsv',
    'https://export.example/file.tsv',
    'https://localhost/file.tsv',
    'https://127.0.0.1/file.tsv',
    'https://[::1]/file.tsv',
    'https://prodfileexportwe.blob.core.windows.net.attacker.invalid/file.tsv',
    'https://extra.regionalfiles.blob.core.windows.net/file.tsv',
    'https://www.etoro.com.attacker.invalid/file.tsv',
    'https://www.etoro.com/' + 'a'.repeat(16384),
  ])
    assert.throws(() => exportURL(url), /INVALID_EXPORT_URL/);
});

test('cancellation settles a client that ignores abort and consumes its late rejection', async () => {
  const controller = new AbortController();
  let rejectClient;
  const client = new Promise((_, reject) => {
    rejectClient = reject;
  });
  const request = abortable(client, controller.signal);
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  rejectClient(new Error('late client failure'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await abortable(Promise.resolve(42), new AbortController().signal), 42);
});

test('export streaming stops at the byte limit even without Content-Length and honours cancellation', async () => {
  const bytes = new TextEncoder().encode('Name\tDate\nCafé\t2026-10-24');
  assert.deepEqual(await responseBytes(new Response(bytes)), bytes);
  await assert.rejects(
    responseBytes(
      new Response('small', { headers: { 'content-length': String(LIMITS.bytes + 1) } }),
    ),
    /FILE_TOO_LARGE/,
  );
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(LIMITS.bytes));
      controller.enqueue(new Uint8Array(1));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(responseBytes(new Response(stream)), /FILE_TOO_LARGE/);
  assert.equal(cancelled, true);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(responseBytes(new Response(bytes), controller.signal), {
    name: 'AbortError',
  });
  await assert.rejects(responseBytes(new Response('', { status: 403 })), /EXPORT_HTTP_ERROR/);
});

test('binary extension messages preserve UTF-8 and UTF-16 bytes without evaluating file contents', () => {
  const bytes = Uint8Array.from([0xff, 0xfe, 0, 65, 0, 233, 255, 1, 0]);
  assert.deepEqual(base64Bytes(bytesBase64(bytes)), bytes);
  assert.throws(() => base64Bytes('<img onerror=bad>'), /INVALID_EXPORT_RESPONSE/);
});
