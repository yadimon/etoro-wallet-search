import { LIMITS, normalize, decodeExport, parseExport, shiftDay, localDay } from './core.mjs';
import { exportURL, responseBytes, base64Bytes, abortable } from './transport.mjs';
import { nativeRecords } from './data.mjs';
import { pageBridgeRequest } from './bridge-client.mjs';

export function waitUntil(predicate, signal, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
      try {
        const value = predicate();
        if (value) return resolve(value);
      } catch (error) {
        return reject(error);
      }
      if (performance.now() - started > timeout) return reject(new Error('EXPORT_TIMEOUT'));
      setTimeout(tick, 80);
    };
    tick();
  });
}

async function extensionExportBytes(url, signal) {
  const result = await pageBridgeRequest('read-export', { url }, signal);
  if (!result.ok) {
    const error = new Error(result.error || 'EXPORT_READ_FAILED');
    if (result.origin) error.origin = exportURL(result.origin).origin;
    throw error;
  }
  return base64Bytes(result.base64);
}

function userscriptExportBytes(url, signal) {
  return new Promise((resolve, reject) => {
    let request,
      timer,
      settled = false;
    const finish = (error, bytes) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', aborted);
      error ? reject(error) : resolve(bytes);
    };
    const aborted = () => {
      finish(new DOMException('Cancelled', 'AbortError'));
      request?.abort();
    };
    const fail = () => finish(new Error('EXPORT_READ_FAILED'));
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) {
      aborted();
      return;
    }
    timer = setTimeout(() => {
      fail();
      request?.abort();
    }, 25000);
    try {
      request = GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        anonymous: true,
        redirect: 'error',
        onload: (response) => {
          try {
            if (response.status < 200 || response.status >= 300)
              throw new Error('EXPORT_HTTP_ERROR');
            const bytes = new Uint8Array(response.response);
            if (bytes.byteLength > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
            finish(null, bytes);
          } catch (error) {
            finish(error);
          }
        },
        onprogress: (event) => {
          if (event.loaded > LIMITS.bytes) {
            finish(new Error('FILE_TOO_LARGE'));
            request?.abort();
          }
        },
        onerror: fail,
        ontimeout: fail,
        onabort: fail,
      });
    } catch {
      fail();
    }
  });
}

async function captureNativeExport(action, options, signal) {
  const anchorPrototype = HTMLAnchorElement.prototype;
  const originals = {
    create: URL.createObjectURL,
    fetch: window.fetch,
    send: XMLHttpRequest.prototype.send,
    click: anchorPrototype.click,
    dispatch: anchorPrototype.dispatchEvent,
  };
  const descriptors = {
    click: Object.getOwnPropertyDescriptor(anchorPrototype, 'click'),
    dispatchEvent: Object.getOwnPropertyDescriptor(anchorPrototype, 'dispatchEvent'),
  };
  const cleanup = [],
    seen = new WeakSet(),
    seenURLs = new Set(),
    io = new AbortController();
  let active = true,
    armed = false,
    resolveFile,
    rejectFile,
    timer;
  const pending = new Promise((resolve, reject) => {
    resolveFile = resolve;
    rejectFile = reject;
  });
  // Install rejection handling immediately while the dialog is being prepared.
  pending.catch(() => {});
  const accept = async (blob, required = false) => {
    if (!active || !armed || !(blob instanceof Blob) || seen.has(blob)) return;
    if (!blob.size || /^(image|audio|video)\//i.test(blob.type)) {
      if (required) rejectFile(new Error('UNRECOGNIZED_HEADER'));
      return;
    }
    seen.add(blob);
    if (blob.size > LIMITS.bytes) {
      rejectFile(new Error('FILE_TOO_LARGE'));
      return;
    }
    let recognized = required;
    try {
      const decoded = decodeExport(await blob.arrayBuffer());
      const heading = decoded
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/, 1)[0]
        .replaceAll('"', '')
        .split(/[\t,;]/)
        .map(normalize)
        .join('|');
      recognized =
        required ||
        heading ===
          'name|date|amount|currency|local amount|local currency|exchange rate|money out|money in';
      const parsed = parseExport(decoded, options);
      if (parsed.profile !== 'etoro-wallet-tsv-v1') {
        if (required) throw new Error('UNRECOGNIZED_HEADER');
        return;
      }
      if (active) resolveFile(parsed);
    } catch (error) {
      if (active && recognized) rejectFile(error); /* Ignore unrelated blobs. */
    }
  };
  const readLink = async (href) => {
    if (!active || !armed || !href || seenURLs.has(href)) return;
    let url;
    try {
      url = new URL(href, location.href);
      if (url.protocol === 'https:') url = exportURL(url.href);
      else if (url.protocol === 'blob:') {
        if (url.origin !== location.origin) return;
      } else if (url.protocol === 'data:') {
        if (
          !/^data:(?:text\/(?:csv|plain|tab-separated-values)|application\/(?:csv|octet-stream)|attachment\/csv)[;,]/i.test(
            href,
          )
        )
          return;
        if (href.length > LIMITS.bytes * 4) throw new Error('FILE_TOO_LARGE');
      } else return;
      seenURLs.add(href);
      options.onDownload?.();
      let bytes;
      try {
        const response = await originals.fetch.call(window, url.href, {
          credentials: url.origin === location.origin ? 'same-origin' : 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'error',
          signal: io.signal,
        });
        bytes = await responseBytes(response, io.signal);
      } catch (error) {
        if (
          error.name === 'AbortError' ||
          error.message === 'FILE_TOO_LARGE' ||
          url.protocol !== 'https:'
        )
          throw error;
        bytes = await (typeof GM_xmlhttpRequest === 'function'
          ? userscriptExportBytes(url.href, io.signal)
          : extensionExportBytes(url.href, io.signal));
      }
      await accept(new Blob([bytes]), true);
    } catch (error) {
      if (active) rejectFile(error);
    }
  };
  const observeAnchor = (anchor) => {
    if (
      !active ||
      !armed ||
      anchor?.tagName !== 'A' ||
      !anchor.getAttribute('href') ||
      (anchor.isConnected && !anchor.hasAttribute('download'))
    )
      return false;
    let url;
    try {
      url = new URL(anchor.href, location.href);
    } catch {
      return false;
    }
    const file =
      /\.(?:csv|tsv)$/i.test(url.pathname) || /\.(?:csv|tsv)$/i.test(anchor.download || '');
    const knownServer = url.origin === 'https://prodfileexportwe.blob.core.windows.net';
    const blob = url.protocol === 'blob:' && url.origin === location.origin;
    const data =
      /^data:(?:text\/(?:csv|plain|tab-separated-values)|application\/(?:csv|octet-stream)|attachment\/csv)[;,]/i.test(
        url.href,
      );
    if (!((url.protocol === 'https:' && (file || knownServer)) || blob || data)) return false;
    void readLink(url.href);
    return true;
  };
  // The current live exporter clicks a detached <a href=fileUrl>. Observing
  // document click events alone misses it; it never creates a CSV Blob.
  // During our automatic import the file is read in memory. Allowing the
  // original click can navigate away from Wallet when the server sends inline.
  const click = function (...args) {
    if (observeAnchor(this)) return;
    return originals.click.apply(this, args);
  };
  const dispatch = function (event, ...args) {
    if (event?.type === 'click' && observeAnchor(this)) return true;
    return originals.dispatch.call(this, event, ...args);
  };
  const clicked = (event) => {
    if (observeAnchor(event.target?.closest?.('a'))) event.preventDefault();
  };
  const create = function (blob, ...args) {
    void accept(blob);
    return originals.create.call(this, blob, ...args);
  };
  const fetchWrapper = async function (...args) {
    const response = await originals.fetch.apply(this, args);
    if (
      active &&
      armed &&
      /csv|tab-separated|octet-stream|text\/plain/i.test(response.headers.get('content-type') || '')
    )
      void responseBytes(response.clone(), io.signal)
        .then((bytes) => accept(new Blob([bytes])))
        .catch(() => {});
    return response;
  };
  const send = function (...args) {
    const xhr = this;
    const loaded = () => {
      if (!active || xhr.status < 200 || xhr.status >= 300) return;
      const type = xhr.getResponseHeader('content-type') || '';
      if (!/csv|tab-separated|octet-stream|text\/plain/i.test(type)) return;
      if (xhr.response instanceof Blob) void accept(xhr.response);
      else if (xhr.response instanceof ArrayBuffer) void accept(new Blob([xhr.response], { type }));
      else if (!xhr.responseType || xhr.responseType === 'text')
        void accept(new Blob([xhr.responseText], { type }));
    };
    xhr.addEventListener('load', loaded, { once: true });
    cleanup.push(() => xhr.removeEventListener('load', loaded));
    return originals.send.apply(this, args);
  };
  const aborted = () => {
    io.abort();
    rejectFile(new DOMException('Cancelled', 'AbortError'));
  };
  try {
    URL.createObjectURL = create;
    window.fetch = fetchWrapper;
    XMLHttpRequest.prototype.send = send;
    anchorPrototype.click = click;
    anchorPrototype.dispatchEvent = dispatch;
    document.addEventListener('click', clicked, true);
    signal.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(() => rejectFile(new Error('EXPORT_TIMEOUT')), 45000);
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    await action(() => {
      armed = true;
    });
    return await pending;
  } finally {
    active = false;
    clearTimeout(timer);
    io.abort();
    document.removeEventListener('click', clicked, true);
    signal.removeEventListener('abort', aborted);
    cleanup.forEach((fn) => fn());
    // Do not overwrite another extension's changes made during this export.
    if (URL.createObjectURL === create) URL.createObjectURL = originals.create;
    if (window.fetch === fetchWrapper) window.fetch = originals.fetch;
    if (XMLHttpRequest.prototype.send === send) XMLHttpRequest.prototype.send = originals.send;
    for (const [key, wrapper] of [
      ['click', click],
      ['dispatchEvent', dispatch],
    ])
      if (anchorPrototype[key] === wrapper) {
        if (descriptors[key]) Object.defineProperty(anchorPrototype, key, descriptors[key]);
        else delete anchorPrototype[key];
      }
  }
}

export const nativePath =
  /^\/api\/money\/v1\/money\/fiat\/account\/[a-zA-Z0-9-]+\/currencyBalances\/[a-zA-Z0-9-]+\/transactions\/list$/;
export function observedEndpoint() {
  for (const entry of performance.getEntriesByType('resource').slice().reverse()) {
    try {
      const url = new URL(entry.name);
      if (url.origin === location.origin && nativePath.test(url.pathname)) {
        const count = Number(url.searchParams.get('itemCount'));
        url.search = '';
        url.searchParams.set(
          'itemCount',
          String(Number.isInteger(count) && count > 0 && count <= 100 ? count : 40),
        );
        return url.href;
      }
    } catch {}
  }
  return null;
}
export function accountIdentity(account, endpoint = observedEndpoint()) {
  const profile = document.querySelector('a[href^="/people/"]')?.getAttribute('href') || '';
  const details =
    account
      .querySelector('.et-wallet-account__group__account_details,et-wallet-account-details')
      ?.textContent?.replace(/[\s-]/g, '')
      .toUpperCase() || '';
  const lengths = {
    DE: 22,
    GB: 22,
    FR: 27,
    IT: 27,
    NL: 18,
    ES: 24,
    BE: 16,
    AT: 20,
    IE: 22,
    PT: 25,
    FI: 18,
    GR: 27,
    LU: 20,
    LT: 20,
    EE: 20,
    LV: 21,
    MT: 31,
    CY: 28,
    SK: 24,
    SI: 19,
    HR: 21,
    RO: 24,
    BG: 22,
    PL: 28,
    CZ: 24,
    DK: 18,
    SE: 24,
    NO: 15,
    CH: 21,
    HU: 28,
  };
  for (const match of details.matchAll(/[A-Z]{2}\d{2}/g)) {
    const size = lengths[match[0].slice(0, 2)],
      iban = size ? details.slice(match.index, match.index + size) : '';
    if (!/^[A-Z]{2}\d{2}[A-Z\d]+$/.test(iban)) continue;
    let remainder = 0;
    for (const char of iban.slice(4) + iban.slice(0, 4)) {
      for (const digit of /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char)
        remainder = (remainder * 10 + Number(digit)) % 97;
    }
    if (remainder === 1) return `${profile}|${iban}`;
  }
  return profile && endpoint ? `${profile}|${new URL(endpoint).pathname}` : null;
}
function siteHttpClient() {
  // Reuse the site's normal interceptors. Never extract or replay auth tokens.
  try {
    const angular =
      window.angular ||
      (typeof window.require === 'function' && window.require.defined?.('angular')
        ? window.require('angular')
        : null);
    if (typeof angular?.element !== 'function') return null;
    for (const node of [
      document.querySelector('et-wallet-account'),
      document.body,
      document.documentElement,
      document,
    ]) {
      const injector = angular.element(node)?.injector?.();
      if (!injector) continue;
      const http = injector.get('$http');
      if (typeof http?.post === 'function') return http;
    }
  } catch {}
  return null;
}
export function nativeErrorCode(error) {
  const code = String(error?.message || '');
  return /^(?:NATIVE_HTTP_[1-5]\d{2}|NATIVE_UNAVAILABLE|INVALID_NATIVE_DATA|INVALID_CURRENCY|INVALID_DATE|AMOUNT_OVERFLOW|INVALID_AMOUNT)$/.test(
    code,
  )
    ? code
    : 'NATIVE_UNAVAILABLE';
}
async function nativePage(url, client, signal) {
  if (!client) {
    const response = await fetch(url.href, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: '{}',
      signal,
    });
    if (!response.ok) throw new Error(`NATIVE_HTTP_${response.status}`);
    const bytes = await responseBytes(response, signal);
    let payload;
    try {
      payload = JSON.parse(decodeExport(bytes));
    } catch {
      throw new Error('INVALID_NATIVE_DATA');
    }
    return { payload, size: bytes.byteLength };
  }
  let cancel;
  const timeout = new Promise((resolve) => {
    cancel = resolve;
  });
  const abort = () => cancel();
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const response = await abortable(
      client.post(url.pathname + url.search, {}, { timeout }),
      signal,
    );
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (
      !response ||
      !Number.isInteger(response.status) ||
      response.status < 200 ||
      response.status >= 300
    )
      throw new Error('NATIVE_UNAVAILABLE');
    const json = JSON.stringify(response.data);
    if (typeof json !== 'string') throw new Error('INVALID_NATIVE_DATA');
    const size = new TextEncoder().encode(json).byteLength;
    if (size > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
    return { payload: response.data, size };
  } catch (error) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599)
      throw new Error(`NATIVE_HTTP_${error.status}`);
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}
export async function loadNative(
  range,
  { endpoint, currency, timeZone, signal, onProgress, onTransport },
) {
  const url = new URL(endpoint);
  if (url.origin !== location.origin || !nativePath.test(url.pathname))
    throw new Error('NATIVE_UNAVAILABLE');
  const observedCount = Number(url.searchParams.get('itemCount')),
    pageSize =
      Number.isInteger(observedCount) && observedCount > 0 && observedCount <= 100
        ? observedCount
        : 40;
  const client = siteHttpClient();
  onTransport?.(client ? 'site-http' : 'fetch');
  const records = [],
    cursors = new Set();
  let next = '',
    receivedBytes = 0,
    receivedRows = 0;
  for (let page = 0; page < Math.ceil(LIMITS.rows / pageSize) + 1; page++) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    url.search = '';
    url.searchParams.set('itemCount', String(pageSize));
    url.searchParams.set('next', next);
    url.searchParams.set('client_request_id', crypto.randomUUID());
    const { payload, size } = await nativePage(url, client, signal);
    receivedBytes += size;
    if (receivedBytes > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
    const parsed = nativeRecords(payload?.transactions ? payload : payload?.data || payload, {
      currency,
      timeZone,
    });
    if (parsed.records.some((row) => row.currency !== currency))
      throw new Error('INVALID_NATIVE_DATA');
    receivedRows += parsed.records.length;
    if (receivedRows > LIMITS.rows) throw new Error('TOO_MANY_ROWS');
    records.push(...parsed.records.filter((row) => row.day >= range.from && row.day <= range.to));
    if (records.length > LIMITS.rows) throw new Error('TOO_MANY_ROWS');
    onProgress?.(records.length);
    const descending = parsed.records.every(
      (row, index) => !index || row.timestamp <= parsed.records[index - 1].timestamp,
    );
    if (
      !parsed.hasMore ||
      (descending && parsed.records.length && parsed.records.at(-1).day < range.from)
    )
      return { records, source: 'native', range };
    if (!parsed.records.length || cursors.has(parsed.next)) throw new Error('INVALID_NATIVE_DATA');
    cursors.add(parsed.next);
    next = parsed.next;
  }
  throw new Error('TOO_MANY_ROWS');
}

export function exportDateValue(day, input) {
  if (input.type === 'date') return day;
  const [year, month, date] = day.split('-'),
    hint = (input.placeholder || 'mm/dd/yyyy').toLowerCase();
  const separator = hint.includes('.') ? '.' : hint.includes('-') ? '-' : '/';
  if (/^(y|a{2,4})/.test(hint)) return [year, month, date].join(separator);
  if (/^(d|j|t)/.test(hint)) return [date, month, year].join(separator);
  return [month, date, year].join(separator);
}
export async function requestCSV(account, range, { currency, timeZone, signal, onProgress }) {
  const visibleInputs = () =>
    [...document.querySelectorAll('input.mat-datepicker-input')].filter(
      (input) => input.getBoundingClientRect().width > 0,
    );
  if (visibleInputs().length) throw new Error('EXISTING_DIALOG');
  const anchor = account.querySelector(
    'et-wallet-account-group-txn-header a,[automation-id*="export"]',
  );
  if (!anchor) throw new Error('EXPORT_LAYOUT_CHANGED');
  const today = localDay(Date.now(), timeZone);
  const request = {
    from: range.from > '2007-01-01' ? shiftDay(range.from, -1) : range.from,
    to: range.to < today ? shiftDay(range.to, 1) : range.to,
  };
  const parsed = await captureNativeExport(
    async (arm) => {
      anchor.click();
      const inputs = await waitUntil(() => {
        const fields = visibleInputs();
        const form = fields[0]?.closest('et-wallet-payments-export-txns-form');
        return fields.length === 2 && form?.contains(fields[1]) ? fields : null;
      }, signal);
      if (!account.isConnected) throw new DOMException('Cancelled', 'AbortError');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      inputs.forEach((input, index) => {
        let day = index ? request.to : request.from;
        if (input.max && day > input.max) day = input.max;
        input.focus();
        setter.call(input, exportDateValue(day, input));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
      });
      const button = await waitUntil(() => {
        // Fail closed on a redesign. Two date fields in an unrelated form do
        // not authorize submitting it, even if it has only one button.
        const exportForm = inputs[0].closest('et-wallet-payments-export-txns-form');
        if (!exportForm?.isConnected || !exportForm.contains(inputs[1])) return null;
        let container = inputs[0].closest('form') || inputs[0].parentElement;
        if (!exportForm.contains(container)) container = exportForm;
        while (container && exportForm.contains(container)) {
          if (container.contains(inputs[1])) {
            const candidates = [...container.querySelectorAll('button')].filter(
              (node) =>
                node.getBoundingClientRect().width > 0 &&
                !node.disabled &&
                node.getAttribute('aria-disabled') !== 'true',
            );
            const submit = candidates.find((node) => node.type === 'submit');
            if (submit) return submit;
            if (candidates.length === 1) return candidates[0];
          }
          if (container === exportForm) break;
          container = container.parentElement;
        }
        return null;
      }, signal);
      arm();
      button.click();
    },
    {
      fileName: `eToro-${request.from}-${request.to}.tsv`,
      currency,
      timeZone,
      onDownload: onProgress,
    },
    signal,
  );
  await waitUntil(() => !visibleInputs().length, signal, 3000).catch((error) => {
    if (error.name === 'AbortError') throw error;
  });
  return {
    ...parsed,
    records: parsed.records.filter(
      (row) => row.currency === currency && row.day >= range.from && row.day <= range.to,
    ),
    range,
    source: 'export',
  };
}
