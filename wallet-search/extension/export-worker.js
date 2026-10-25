// Bundled locally with the pure policy, transport, data and cache modules.
chrome.runtime.onMessage.addListener(
  createMessageHandler({
    runtimeId: chrome.runtime.id,
    permissions: chrome.permissions,
    fetchFile: (url, options) => fetch(url, options),
    operateCache: createCacheStore(indexedDB),
  }),
);
