// One bounded request protocol for the two page-to-extension adapters.
// postMessage is not an authentication boundary against other eToro scripts.
export function pageBridgeRequest(type, fields, signal) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    let timer,
      settled = false,
      acknowledged = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('message', received);
      signal?.removeEventListener('abort', aborted);
      error ? reject(error) : resolve(value);
    };
    const aborted = () => {
      if (type === 'read-export') {
        window.postMessage(
          { source: 'wallet-search:page', type: 'cancel-export', id },
          location.origin,
        );
      }
      finish(new DOMException('Cancelled', 'AbortError'));
    };
    const received = (event) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.source !== 'wallet-search:extension' ||
        event.data.id !== id
      )
        return;
      if (event.data.ack === true) {
        // Repeated acknowledgements must never extend a request indefinitely.
        if (!acknowledged) {
          acknowledged = true;
          clearTimeout(timer);
          timer = setTimeout(
            () => finish(new Error('BRIDGE_UNAVAILABLE')),
            type === 'read-export' ? 28_000 : 15_000,
          );
        }
        return;
      }
      const result = event.data.result;
      if (!result || typeof result.ok !== 'boolean') return;
      finish(null, result);
    };
    window.addEventListener('message', received);
    signal?.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(() => finish(new Error('BRIDGE_UNAVAILABLE')), 1200);
    if (signal?.aborted) {
      aborted();
      return;
    }
    try {
      window.postMessage({ source: 'wallet-search:page', type, id, ...fields }, location.origin);
    } catch {
      finish(new Error('BRIDGE_UNAVAILABLE'));
    }
  });
}
