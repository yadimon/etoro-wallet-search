// Shared rules for the page bridge, service worker and permission popup.
// MAIN-world page code is an untrusted caller of extension privileges.
export const WALLET_ORIGIN = 'https://www.etoro.com';
export const MAX_EXPORT_URL_LENGTH = 16_384;
export const MAX_DOCUMENT_REQUESTS = 4;
export const MAX_WORKER_REQUESTS = 16;

export function validRequestId(value) {
  return typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
}

export function validCacheScope(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

export function walletURL(value) {
  try {
    const url = new URL(value);
    return url.origin === WALLET_ORIGIN && /^\/wallet\/account\/[A-Z]{3}\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function azureExportOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^[a-z0-9]{3,24}\.blob\.core\.windows\.net$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function permittedExportURL(value) {
  if (typeof value !== 'string' || value.length > MAX_EXPORT_URL_LENGTH) {
    throw new Error('INVALID_EXPORT_URL');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('INVALID_EXPORT_URL');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    (url.origin !== WALLET_ORIGIN && !azureExportOrigin(value))
  ) {
    throw new Error('INVALID_EXPORT_URL');
  }
  url.hash = '';
  return url;
}
