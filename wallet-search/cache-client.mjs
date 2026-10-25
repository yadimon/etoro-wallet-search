import { updateSnapshot, compactCacheRecords } from './data.mjs';
import { pageBridgeRequest } from './bridge-client.mjs';

export function cacheRequest(type, scope, payload, signal) {
  const key = `wallet-search-cache-v3:${scope}`;
  if (typeof GM_getValue === 'function') {
    const operation = async () => {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (type === 'cache-read') return await GM_getValue(key, null);
      if (type === 'cache-clear') {
        await GM_deleteValue(key);
        return true;
      }
      const value = updateSnapshot(await GM_getValue(key, null), payload);
      await GM_setValue(key, value);
      return true;
    };
    return navigator.locks ? navigator.locks.request(key, operation) : operation();
  }
  const transmitted =
    type === 'cache-write'
      ? {
          range: payload.range,
          currency: payload.currency,
          timeZone: payload.timeZone,
          today: payload.today,
          recordRows: compactCacheRecords(payload.records),
        }
      : payload;
  return pageBridgeRequest(type, { scope, payload: transmitted }, signal).then((result) => {
    if (!result.ok) throw new Error('CACHE_UNAVAILABLE');
    return result.value;
  });
}
