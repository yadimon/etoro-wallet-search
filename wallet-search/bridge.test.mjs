import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createMessageHandler } from './bridge.mjs';
import { validRequestId, walletURL } from './policy.mjs';

const sender = {
  id: 'test-extension',
  frameId: 0,
  tab: { id: 7 },
  documentId: 'document-a',
  url: 'https://www.etoro.com/wallet/account/EUR',
};
const request = (type = 'read-export', fields = {}) => ({
  id: randomUUID(),
  type: `wallet-search:${type}`,
  url: 'https://prodfileexportwe.blob.core.windows.net/export.tsv?sig=private',
  ...fields,
});
function harness(overrides = {}) {
  const calls = { fetch: [], cache: [], permissions: [] };
  const handler = createMessageHandler({
    runtimeId: sender.id,
    permissions: {
      contains: async (value) => {
        calls.permissions.push(value);
        return true;
      },
    },
    fetchFile: async (...args) => {
      calls.fetch.push(args);
      return new Response('synthetic');
    },
    operateCache: async (...args) => {
      calls.cache.push(args);
      return null;
    },
    ...overrides,
  });
  const invoke = (message, from = sender) =>
    new Promise((resolve) => handler(message, from, resolve));
  return { handler, invoke, calls };
}

test('bridge rejects external senders, frames, non-Wallet routes and malformed ids', () => {
  const { handler, calls } = harness();
  let responses = 0;
  for (const from of [
    { ...sender, id: 'another-extension' },
    { ...sender, frameId: 1 },
    { ...sender, url: 'https://attacker.invalid/wallet/account/EUR' },
    { ...sender, url: 'https://www.etoro.com/home' },
    { ...sender, tab: {} },
    null,
  ])
    assert.equal(
      handler(request(), from, () => responses++),
      undefined,
    );
  for (const id of ['a'.repeat(36), '-'.repeat(36), {}, 'abc'])
    assert.equal(
      handler(request('cache-clear', { id, scope: 'a'.repeat(64) }), sender, () => responses++),
      undefined,
    );
  assert.equal(responses, 0);
  assert.equal(calls.fetch.length, 0);
  assert.equal(calls.cache.length, 0);
  assert.equal(validRequestId(randomUUID()), true);
  assert.equal(walletURL(sender.url + '?example=1'), true);
});

test('bridge validates export origins even when Chrome has granted broad or stale permissions', async () => {
  const { invoke, calls } = harness();
  for (const url of [
    'https://attacker.invalid/export.tsv',
    'https://127.0.0.1/export.tsv',
    'https://regionalfiles.blob.core.windows.net.attacker.invalid/export.tsv',
  ])
    assert.deepEqual(await invoke(request('read-export', { url })), {
      ok: false,
      error: 'INVALID_EXPORT_URL',
    });
  assert.equal(calls.permissions.length, 0);
  assert.equal(calls.fetch.length, 0);
});

test('missing export permission reports only an allowed origin, never its signed query', async () => {
  const { invoke, calls } = harness({ permissions: { contains: async () => false } });
  assert.deepEqual(await invoke(request()), {
    ok: false,
    error: 'EXPORT_HOST_PERMISSION',
    origin: 'https://prodfileexportwe.blob.core.windows.net',
  });
  assert.equal(calls.fetch.length, 0);
});

test('export worker fixes method and credential policy and masks network error details', async () => {
  const { invoke, calls } = harness();
  assert.deepEqual(
    await invoke(
      request('read-export', { method: 'POST', headers: { Authorization: 'bad' }, body: 'bad' }),
    ),
    { ok: true, base64: btoa('synthetic') },
  );
  const [url, options] = calls.fetch[0];
  assert.match(url, /sig=private/);
  assert.equal(options.method, 'GET');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.headers, undefined);
  assert.equal(options.body, undefined);
  const failed = harness({
    fetchFile: async () => {
      throw new Error('secret signed URL and account response');
    },
  });
  assert.deepEqual(await failed.invoke(request()), { ok: false, error: 'EXPORT_READ_FAILED' });
});

test('cache messages validate scopes and expose only the whitelisted cache operations', async () => {
  const { handler, invoke, calls } = harness();
  let responses = 0;
  handler(request('cache-read', { scope: '../accounts' }), sender, () => responses++);
  handler(request('cache-drop-all', { scope: 'a'.repeat(64) }), sender, () => responses++);
  assert.equal(responses, 0);
  assert.equal(calls.cache.length, 0);
  assert.deepEqual(await invoke(request('cache-read', { scope: 'a'.repeat(64) })), {
    ok: true,
    value: null,
  });
  assert.equal(calls.cache[0][0], 'cache-read');
  const failed = harness({
    operateCache: async () => {
      throw new Error('private record');
    },
  });
  assert.deepEqual(
    await failed.invoke(request('cache-write', { scope: 'b'.repeat(64), payload: {} })),
    { ok: false, error: 'CACHE_UNAVAILABLE' },
  );
});

test('worker concurrency is bounded per document and cancellation cannot cross documents', async () => {
  const started = [];
  const { handler, invoke } = harness({
    fetchFile: (_url, { signal }) =>
      new Promise((_, reject) => {
        started.push(signal);
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelled', 'AbortError')),
          { once: true },
        );
      }),
  });
  const messages = Array.from({ length: 4 }, () => request()),
    pending = messages.map((message) => invoke(message));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started.length, 4);
  assert.deepEqual(await invoke(request()), { ok: false, error: 'EXPORT_READ_FAILED' });
  assert.deepEqual(
    await invoke(
      { ...messages[0], type: 'wallet-search:cancel-export' },
      { ...sender, documentId: 'document-b' },
    ),
    { ok: true },
  );
  assert.equal(started[0].aborted, false);
  assert.deepEqual(await invoke(messages[0]), { ok: false, error: 'EXPORT_READ_FAILED' });
  for (const message of messages)
    handler({ ...message, type: 'wallet-search:cancel-export' }, sender, () => {});
  assert.deepEqual(
    await Promise.all(pending),
    Array.from({ length: 4 }, () => ({ ok: false, error: 'EXPORT_ABORTED' })),
  );
});

test('a global worker limit prevents many documents from multiplying privileged loads', async () => {
  const { handler, invoke } = harness({
    fetchFile: (_url, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelled', 'AbortError')),
          { once: true },
        ),
      ),
  });
  const pending = [];
  for (let tab = 0; tab < 4; tab++)
    for (let i = 0; i < 4; i++) {
      const message = request(),
        from = { ...sender, tab: { id: tab } };
      pending.push({ message, from, promise: invoke(message, from) });
    }
  assert.deepEqual(await invoke(request(), { ...sender, tab: { id: 99 } }), {
    ok: false,
    error: 'EXPORT_READ_FAILED',
  });
  await new Promise((resolve) => setImmediate(resolve));
  for (const { message, from } of pending)
    handler({ ...message, type: 'wallet-search:cancel-export' }, from, () => {});
  await Promise.all(pending.map((value) => value.promise));
});
