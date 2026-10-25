import {
  MAX_DOCUMENT_REQUESTS,
  MAX_WORKER_REQUESTS,
  validRequestId,
  validCacheScope,
  walletURL,
} from './policy.mjs';
import { exportURL, responseBytes, bytesBase64 } from './transport.mjs';

// All privileged operations are revalidated here, even if the content script
// has already checked them. No page-supplied headers, methods or credentials.
export function createMessageHandler({ runtimeId, permissions, fetchFile, operateCache }) {
  const requests = new Map(),
    documents = new Map();
  return function handleMessage(message, sender, respond) {
    if (
      sender?.id !== runtimeId ||
      sender.frameId !== 0 ||
      !Number.isInteger(sender.tab?.id) ||
      !walletURL(sender.url) ||
      !validRequestId(message?.id)
    )
      return;
    const owner = `${sender.tab.id}:${sender.documentId || 'top'}`;
    const key = `${owner}:${message.id}`;
    if (message.type === 'wallet-search:cancel-export') {
      if (requests.get(key)?.type === 'wallet-search:read-export')
        requests.get(key).controller.abort();
      respond({ ok: true });
      return;
    }
    const cache = [
      'wallet-search:cache-read',
      'wallet-search:cache-write',
      'wallet-search:cache-clear',
    ].includes(message.type);
    if (!cache && message.type !== 'wallet-search:read-export') return;
    if (cache && !validCacheScope(message.scope)) return;
    if (
      requests.has(key) ||
      requests.size >= MAX_WORKER_REQUESTS ||
      (documents.get(owner) || 0) >= MAX_DOCUMENT_REQUESTS
    ) {
      respond({ ok: false, error: cache ? 'CACHE_UNAVAILABLE' : 'EXPORT_READ_FAILED' });
      return;
    }
    const controller = new AbortController();
    requests.set(key, { controller, type: message.type });
    documents.set(owner, (documents.get(owner) || 0) + 1);
    const timer = cache ? null : setTimeout(() => controller.abort(), 25_000);
    // Chrome can close the receiver while a request is in flight.
    const reply = (result) => {
      try {
        respond(result);
      } catch {
        /* Receiver closed. */
      }
    };
    void (async () => {
      try {
        if (cache) {
          const value = await operateCache(
            message.type.slice('wallet-search:'.length),
            message.scope,
            message.payload,
          );
          reply({ ok: true, value });
          return;
        }
        const url = exportURL(message.url);
        if (!(await permissions.contains({ origins: [`${url.origin}/*`] }))) {
          reply({ ok: false, error: 'EXPORT_HOST_PERMISSION', origin: url.origin });
          return;
        }
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const response = await fetchFile(url.href, {
          method: 'GET',
          credentials: 'omit',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        reply({ ok: true, base64: bytesBase64(await responseBytes(response, controller.signal)) });
      } catch (error) {
        const code = cache
          ? 'CACHE_UNAVAILABLE'
          : ['FILE_TOO_LARGE', 'INVALID_EXPORT_URL'].includes(error?.message)
            ? error.message
            : error?.name === 'AbortError'
              ? 'EXPORT_ABORTED'
              : 'EXPORT_READ_FAILED';
        reply({ ok: false, error: code });
      } finally {
        clearTimeout(timer);
        requests.delete(key);
        const remaining = (documents.get(owner) || 1) - 1;
        if (remaining) documents.set(owner, remaining);
        else documents.delete(owner);
      }
    })();
    return true;
  };
}
