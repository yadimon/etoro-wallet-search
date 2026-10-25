import { updateSnapshot } from './data.mjs';
import { validCacheScope } from './policy.mjs';

export function createCacheStore(indexedDB) {
  const open = () =>
    new Promise((resolve, reject) => {
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('CACHE_UNAVAILABLE'));
      };
      const timer = setTimeout(fail, 5000);
      const request = indexedDB.open('wallet-search-local-v3', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('accounts');
      request.onsuccess = () => {
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = request.onblocked = fail;
    });
  return async function cacheOperation(type, scope, payload) {
    if (!validCacheScope(scope)) throw new Error('CACHE_IDENTITY');
    if (!['cache-read', 'cache-write', 'cache-clear'].includes(type))
      throw new Error('INVALID_CACHE');
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(
            'accounts',
            type === 'cache-read' ? 'readonly' : 'readwrite',
          ),
          store = transaction.objectStore('accounts');
        let result = null;
        const timer = setTimeout(() => {
          try {
            transaction.abort();
          } catch {
            /* Already inactive. */
          }
        }, 10000);
        transaction.oncomplete = () => {
          clearTimeout(timer);
          resolve(result);
        };
        transaction.onerror = transaction.onabort = () => {
          clearTimeout(timer);
          reject(new Error('CACHE_UNAVAILABLE'));
        };
        if (type === 'cache-clear') {
          store.delete(scope);
          result = true;
          return;
        }
        const request = store.get(scope);
        request.onsuccess = () => {
          try {
            if (type === 'cache-read') {
              result = request.result || null;
              return;
            }
            if (type !== 'cache-write') throw new Error('INVALID_CACHE');
            const value = updateSnapshot(request.result || null, payload);
            store.put(value, scope);
            result = true;
          } catch {
            transaction.abort();
          }
        };
      });
    } finally {
      db.close();
    }
  };
}
