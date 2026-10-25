import test from 'node:test';
import assert from 'node:assert/strict';
import { pageBridgeRequest } from './bridge-client.mjs';

function environment(t) {
  const listeners = new Set(),
    sent = [];
  const fake = {
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    postMessage: (value) => sent.push(value),
  };
  const previous = Object.fromEntries(
    ['window', 'location'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  globalThis.window = fake;
  globalThis.location = { origin: 'https://www.etoro.com' };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => {
    t.mock.timers.reset();
    for (const key of ['window', 'location']) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
      else delete globalThis[key];
    }
  });
  const deliver = (data, fields = {}) => {
    for (const listener of [...listeners])
      listener({ source: fake, origin: location.origin, data, ...fields });
  };
  const reply = (fields) => ({ source: 'wallet-search:extension', id: sent[0].id, ...fields });
  return { fake, sent, listeners, deliver, reply };
}

test('repeated acknowledgements cannot prolong the cache request deadline', async (t) => {
  const env = environment(t),
    promise = pageBridgeRequest('cache-read', { scope: 'a'.repeat(64) });
  env.deliver(env.reply({ ack: true }));
  t.mock.timers.tick(14_000);
  env.deliver(env.reply({ ack: true }));
  t.mock.timers.tick(1001);
  await assert.rejects(promise, /BRIDGE_UNAVAILABLE/);
  assert.equal(env.listeners.size, 0);
});

test('bridge responses require the same window, origin, id and a boolean result', async (t) => {
  const env = environment(t),
    promise = pageBridgeRequest('cache-read', { scope: 'a'.repeat(64) });
  env.deliver(env.reply({ result: { ok: true, value: 'wrong origin' } }), {
    origin: 'https://attacker.invalid',
  });
  env.deliver(env.reply({ result: { ok: true, value: 'wrong source' } }), { source: {} });
  env.deliver({ ...env.reply({ result: { ok: true } }), id: crypto.randomUUID() });
  env.deliver(env.reply({ result: { ok: 'true' } }));
  assert.equal(env.listeners.size, 1);
  env.deliver(env.reply({ result: { ok: true, value: 42 } }));
  assert.deepEqual(await promise, { ok: true, value: 42 });
  assert.equal(env.listeners.size, 0);
});

test('abort removes bridge listeners and sends cancellation only for exports', async (t) => {
  const env = environment(t),
    controller = new AbortController();
  const promise = pageBridgeRequest(
    'read-export',
    { url: 'https://www.etoro.com/export.tsv' },
    controller.signal,
  );
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
  assert.equal(env.sent[1].type, 'cancel-export');
  assert.equal(env.sent[1].id, env.sent[0].id);
  assert.equal(env.listeners.size, 0);
});

test('message clone failure rejects promptly and cleans up listeners', async (t) => {
  const env = environment(t);
  env.fake.postMessage = () => {
    throw new DOMException('Clone failed', 'DataCloneError');
  };
  await assert.rejects(
    pageBridgeRequest('cache-read', { scope: 'a'.repeat(64) }),
    /BRIDGE_UNAVAILABLE/,
  );
  assert.equal(env.listeners.size, 0);
});
