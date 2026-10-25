// Isolated content script. The bundled policy module defines the shared guards.
// The page can observe bridge messages; never send credentials through it.
(() => {
  const requests = new Set();
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== WALLET_ORIGIN || !walletURL(location.href))
      return;
    const message = event.data;
    if (message?.source !== 'wallet-search:page' || !validRequestId(message.id)) return;
    if (message.type === 'cancel-export') {
      if (requests.has(message.id))
        void chrome.runtime
          .sendMessage({ type: 'wallet-search:cancel-export', id: message.id })
          .catch(() => {});
      return;
    }
    if (
      !['read-export', 'cache-read', 'cache-write', 'cache-clear'].includes(message.type) ||
      requests.has(message.id) ||
      requests.size >= MAX_DOCUMENT_REQUESTS
    )
      return;
    if (message.type === 'read-export') {
      try {
        permittedExportURL(message.url);
      } catch {
        window.postMessage(
          {
            source: 'wallet-search:extension',
            id: message.id,
            result: { ok: false, error: 'INVALID_EXPORT_URL' },
          },
          location.origin,
        );
        return;
      }
    }
    if (message.type.startsWith('cache-') && !validCacheScope(message.scope)) return;
    requests.add(message.id);
    window.postMessage(
      { source: 'wallet-search:extension', id: message.id, ack: true },
      location.origin,
    );
    chrome.runtime
      .sendMessage({
        type: `wallet-search:${message.type}`,
        id: message.id,
        url: message.url,
        scope: message.scope,
        payload: message.payload,
      })
      .then(
        (result) =>
          window.postMessage(
            { source: 'wallet-search:extension', id: message.id, result },
            location.origin,
          ),
        () =>
          window.postMessage(
            {
              source: 'wallet-search:extension',
              id: message.id,
              result: { ok: false, error: 'EXPORT_READ_FAILED' },
            },
            location.origin,
          ),
      )
      .finally(() => requests.delete(message.id));
  });
})();
