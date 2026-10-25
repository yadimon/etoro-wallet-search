import { LIMITS } from './core.mjs';
import { permittedExportURL } from './policy.mjs';

// Only the exact HTTPS file link emitted by the native exporter is read.
// No API discovery, authentication headers, cookies or request replay.
export function exportURL(value) {
  return permittedExportURL(value);
}

// Cancellation must settle even when a third-party client ignores its timeout.
export function abortable(operation, signal) {
  if (!signal) return Promise.resolve(operation);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', aborted);
      error ? reject(error) : resolve(value);
    };
    const aborted = () => finish(new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', aborted, { once: true });
    Promise.resolve(operation).then(
      (value) => finish(null, value),
      (error) => finish(error),
    );
    if (signal.aborted) aborted();
  });
}

export async function responseBytes(response, signal) {
  if (!response.ok) throw new Error('EXPORT_HTTP_ERROR');
  if (Number(response.headers.get('content-length')) > LIMITS.bytes)
    throw new Error('FILE_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
    return bytes;
  }
  const chunks = [];
  let length = 0;
  const aborted = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', aborted, { once: true });
  try {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    while (true) {
      const { value, done } = await reader.read();
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (done) break;
      length += value.byteLength;
      if (length > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal?.removeEventListener('abort', aborted);
    reader.releaseLock();
  }
}

export function bytesBase64(bytes) {
  if (bytes.byteLength > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  return btoa(chunks.join(''));
}

export function base64Bytes(value) {
  if (
    typeof value !== 'string' ||
    value.length > Math.ceil(LIMITS.bytes / 3) * 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw new Error('INVALID_EXPORT_RESPONSE');
  const binary = atob(value);
  if (binary.length > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
