import {
  LIMITS,
  normalize,
  parseMinor,
  parseDate,
  localDay,
  shiftDay,
  monthRange,
  mergeExports,
  missingRanges,
} from './core.mjs';

export const CATEGORIES = Object.freeze([
  'payments',
  'transferIn',
  'transferOut',
  'cash',
  'refunds',
  'fees',
  'adjustments',
  'otherIn',
  'otherOut',
]);
export const STATUSES = Object.freeze(['settled', 'pending', 'failed', 'unknown']);
// Observed in the native Wallet client, 2026-10-24. Unknown enum values stay
// unknown; a debit alone is never enough to call something a card payment.
const nativeTypes = {
  1: 'payments',
  2: 'payments',
  3: 'payments',
  4: 'cash',
  5: 'transferIn',
  6: 'transferOut',
  7: 'transferIn',
  8: 'transferOut',
  9: 'refunds',
  10: 'fees',
  11: 'adjustments',
  12: 'adjustments',
  13: 'payments',
  14: 'transferIn',
};
const nativeStatuses = {
  0: 'settled',
  1: 'pending',
  2: 'failed',
  3: 'failed',
  4: 'failed',
  5: 'failed',
  6: 'pending',
  7: 'pending',
  8: 'pending',
  9: 'failed',
};
const isoNumbers = {
  36: 'AUD',
  124: 'CAD',
  203: 'CZK',
  208: 'DKK',
  348: 'HUF',
  578: 'NOK',
  702: 'SGD',
  752: 'SEK',
  756: 'CHF',
  826: 'GBP',
  840: 'USD',
  946: 'RON',
  978: 'EUR',
  985: 'PLN',
};

export function recordCurrency(value, fallback) {
  const currency =
    typeof value === 'number' || /^\d+$/.test(String(value || ''))
      ? isoNumbers[Number(value)]
      : String(value || fallback || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency || '')) throw new Error('INVALID_CURRENCY');
  return currency;
}
export function nativeRecords(payload, { currency, timeZone } = {}) {
  if (!payload || payload.error || !Array.isArray(payload.transactions))
    throw new Error('NATIVE_UNAVAILABLE');
  if (
    typeof payload.hasMoreRecords !== 'boolean' ||
    (payload.next !== null && payload.next !== undefined && typeof payload.next !== 'string')
  )
    throw new Error('INVALID_NATIVE_DATA');
  if (payload.transactions.length > LIMITS.rows) throw new Error('TOO_MANY_ROWS');
  const records = payload.transactions.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('INVALID_NATIVE_DATA');
    const date = parseDate(item.transactionTime);
    const minor = parseMinor(item.amount);
    if (minor === null) throw new Error('INVALID_NATIVE_DATA');
    const name = String(item.label || item.merchantName || '').slice(0, 4096);
    const id =
      item.transactionId === undefined || item.transactionId === null
        ? ''
        : String(item.transactionId);
    if (
      id.length > 200 ||
      (item.transactionId !== undefined &&
        item.transactionId !== null &&
        !['string', 'number'].includes(typeof item.transactionId))
    )
      throw new Error('INVALID_NATIVE_DATA');
    const rowCurrency = recordCurrency(item.currencyCode ?? item.currency, currency);
    const day = date.dateOnly ? date.calendarDay : localDay(date.timestamp, timeZone);
    // Never resolve inherited properties such as "constructor" or "__proto__".
    const category =
      Number.isInteger(item.customerTransactionType) &&
      Object.hasOwn(nativeTypes, item.customerTransactionType)
        ? nativeTypes[item.customerTransactionType]
        : minor > 0
          ? 'otherIn'
          : 'otherOut';
    const status =
      Number.isInteger(item.transactionAnnotation) &&
      Object.hasOwn(nativeStatuses, item.transactionAnnotation)
        ? nativeStatuses[item.transactionAnnotation]
        : 'unknown';
    const row = {
      name,
      id,
      timestamp: date.timestamp,
      dateOnly: date.dateOnly,
      day,
      month: day.slice(0, 7),
      minor,
      currency: rowCurrency,
      localMinor: null,
      localCurrency: '',
      category,
      status,
      source: 'native',
      search: normalize(name),
    };
    row.fingerprint = id
      ? JSON.stringify([rowCurrency, id])
      : JSON.stringify([name, row.timestamp, minor, rowCurrency, category, status]);
    return row;
  });
  const next = payload.next === null || payload.next === undefined ? '' : String(payload.next);
  if (next.length > 4096 || (payload.hasMoreRecords && !next))
    throw new Error('INVALID_NATIVE_DATA');
  return { records, next, hasMore: payload.hasMoreRecords === true };
}

export function fallbackRecords(records, hints = []) {
  return records.map((row) => {
    const matches = hints.filter(
      (h) => h.minor === row.minor && h.day === row.day && h.search === row.search,
    );
    const hint = matches.length === 1 ? matches[0] : null;
    return {
      ...row,
      category: hint?.category || (row.minor > 0 ? 'otherIn' : 'otherOut'),
      status: hint?.status || 'unknown',
      source: 'export',
    };
  });
}
export function ledgerTotals(records, { month = '', categories = CATEGORIES } = {}) {
  const summary = { incoming: 0, outgoing: 0, net: 0, count: 0, pending: 0, failed: 0, unknown: 0 };
  for (const row of records) {
    if ((month && row.month !== month) || !categories.includes(row.category)) continue;
    if (row.status === 'failed') {
      summary.failed++;
      continue;
    }
    if (row.status === 'pending') {
      summary.pending++;
      continue;
    }
    if (row.status === 'unknown') {
      summary.unknown++;
      continue;
    }
    if (row.minor > 0) summary.incoming += row.minor;
    if (row.minor < 0) summary.outgoing -= row.minor;
    summary.net += row.minor;
    summary.count++;
    if (![summary.incoming, summary.outgoing, summary.net].every(Number.isSafeInteger))
      throw new Error('AMOUNT_OVERFLOW');
  }
  return summary;
}

// Validate all statuses before committing a dataset. A pending/failed layer
// must not overflow later, after the last good in-memory view was replaced.
export function validateLedger(records) {
  let incoming = 0,
    outgoing = 0;
  for (const row of records) {
    if (!Number.isSafeInteger(row.minor)) throw new Error('INVALID_AMOUNT');
    if (row.minor > 0) incoming += row.minor;
    else outgoing -= row.minor;
    if (!Number.isSafeInteger(incoming) || !Number.isSafeInteger(outgoing))
      throw new Error('AMOUNT_OVERFLOW');
  }
}
export function monthlyLayers(
  records,
  year,
  { categories = CATEGORIES, statuses = ['settled'] } = {},
) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: `${year}-${String(i + 1).padStart(2, '0')}`,
    incoming: [],
    outgoing: [],
    totalIn: 0,
    totalOut: 0,
  }));
  for (const row of records) {
    if (
      row.month.slice(0, 4) !== String(year) ||
      !categories.includes(row.category) ||
      !statuses.includes(row.status)
    )
      continue;
    const item = months[Number(row.month.slice(5)) - 1];
    if (!item) continue;
    const list = row.minor > 0 ? item.incoming : item.outgoing;
    const key = `${row.category}:${row.status}`;
    let layer = list.find((layer) => layer.key === key);
    if (!layer) {
      layer = { key, category: row.category, status: row.status, minor: 0, count: 0 };
      list.push(layer);
    }
    layer.minor += Math.abs(row.minor);
    layer.count++;
    if (!Number.isSafeInteger(layer.minor)) throw new Error('AMOUNT_OVERFLOW');
  }
  for (const item of months) {
    for (const direction of ['incoming', 'outgoing'])
      item[direction].sort(
        (a, b) =>
          CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
          STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
      );
    item.totalIn = item.incoming.reduce((sum, layer) => sum + layer.minor, 0);
    item.totalOut = item.outgoing.reduce((sum, layer) => sum + layer.minor, 0);
    if (!Number.isSafeInteger(item.totalIn) || !Number.isSafeInteger(item.totalOut))
      throw new Error('AMOUNT_OVERFLOW');
  }
  return months;
}

// This is an automatic revalidation window, not a settlement deadline.
export const PENDING_RECHECK_DAYS = 42;
export const pendingFrom = (today) => shiftDay(today, -PENDING_RECHECK_DAYS);
export const needsRecheck = (row) => row.status === 'pending' || row.status === 'unknown';
// Automatic visits refresh forward from the newest verified day. Do not fill
// unrelated historical gaps until the user actually searches those periods.
export function automaticRefreshRange(ranges, today, pendingDays = [], firstDay = '2007-01-01') {
  let from = ranges.length
    ? ranges.reduce((latest, range) => (range.to > latest ? range.to : latest), firstDay)
    : firstDay;
  if (from > today) from = today;
  const cutoff = pendingFrom(today);
  for (const day of pendingDays)
    if (day >= cutoff && day <= today && day >= firstDay && day < from) from = day;
  return { from, to: today };
}
export function cachePlan(range, ranges, today, pendingDays = []) {
  const gaps = missingRanges(range.from, range.to, ranges),
    cutoff = pendingFrom(today);
  // Overlap the last successfully fetched local date to catch later entries
  // on the same day, including after reloading the page.
  if (range.to >= today) {
    const through = ranges.reduce((latest, r) => (r.to > latest ? r.to : latest), range.from);
    const from = through > today ? today : through;
    gaps.push({ from: from > range.from ? from : range.from, to: range.to });
  }
  for (const day of pendingDays)
    if (day >= cutoff && day <= today && day >= range.from && day <= range.to)
      gaps.push({ from: day, to: range.to });
  if (!gaps.length) return null;
  return {
    from: gaps.reduce((min, r) => (r.from < min ? r.from : min), gaps[0].from),
    to: gaps.reduce((max, r) => (r.to > max ? r.to : max), gaps[0].to),
  };
}
export function cacheScopeValue({ account, currency, timeZone }) {
  if (
    typeof account !== 'string' ||
    !account ||
    account.length > 2048 ||
    !/^[A-Z]{3}$/.test(currency)
  )
    throw new Error('CACHE_IDENTITY');
  // A deterministic value hashed in the page; raw account identifiers never
  // become IndexedDB keys or appear in the public status object.
  return JSON.stringify(['wallet-search-cache-v3', account, currency, timeZone]);
}
function pack(row) {
  return [
    row.id,
    row.name,
    row.timestamp,
    row.minor,
    row.currency,
    row.localMinor,
    row.localCurrency,
    row.category,
    row.status,
    !!row.dateOnly,
  ];
}
export const compactCacheRecords = (records) => records.map(pack);
function unpack(cells, timeZone) {
  if (!Array.isArray(cells) || cells.length !== 10) throw new Error('INVALID_CACHE');
  const [
    id,
    name,
    timestamp,
    minor,
    currency,
    localMinor,
    localCurrency,
    category,
    status,
    dateOnly,
  ] = cells;
  if (
    typeof id !== 'string' ||
    id.length > 200 ||
    typeof name !== 'string' ||
    name.length > 4096 ||
    !Number.isSafeInteger(timestamp) ||
    !Number.isSafeInteger(minor) ||
    !CATEGORIES.includes(category) ||
    !STATUSES.includes(status) ||
    typeof dateOnly !== 'boolean' ||
    typeof currency !== 'string' ||
    !/^[A-Z]{3}$/.test(currency) ||
    (localMinor !== null && !Number.isSafeInteger(localMinor)) ||
    typeof localCurrency !== 'string' ||
    (localCurrency !== '' && !/^[A-Z]{3}$/.test(localCurrency))
  )
    throw new Error('INVALID_CACHE');
  const utcDay = new Date(timestamp).toISOString().slice(0, 10),
    calendar = parseDate(utcDay);
  if (dateOnly && calendar.timestamp !== timestamp) throw new Error('INVALID_CACHE');
  const day = dateOnly
    ? new Date(timestamp).toISOString().slice(0, 10)
    : localDay(timestamp, timeZone);
  const row = {
    id,
    name,
    timestamp,
    minor,
    currency,
    localMinor,
    localCurrency,
    category,
    status,
    dateOnly,
    day,
    month: day.slice(0, 7),
    source: 'cache',
    search: normalize(name),
  };
  row.fingerprint = id
    ? JSON.stringify([currency, id])
    : JSON.stringify([name, timestamp, minor, currency, category, status]);
  return row;
}
function cacheDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('INVALID_CACHE');
  parseDate(value);
  return value;
}
function cacheContext({ currency, timeZone, today }) {
  if (
    typeof currency !== 'string' ||
    !/^[A-Z]{3}$/.test(currency) ||
    typeof timeZone !== 'string' ||
    !timeZone ||
    timeZone.length > 100
  )
    throw new Error('INVALID_CACHE');
  cacheDay(today);
  localDay(Date.now(), timeZone);
}
function cacheRows(rows, { currency, timeZone }) {
  let size = 0;
  const encoder = new TextEncoder();
  const records = rows.map((cells) => {
    const row = unpack(cells, timeZone);
    if (row.currency !== currency) throw new Error('INVALID_CACHE');
    size += encoder.encode(JSON.stringify(cells)).byteLength;
    if (size > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
    return row;
  });
  validateLedger(records);
  return records;
}
export function readSnapshot(value, { currency, timeZone, today }) {
  cacheContext({ currency, timeZone, today });
  if (!value) return { records: [], ranges: [], pendingDays: [] };
  if (
    ![3, 4].includes(value.schema) ||
    value.currency !== currency ||
    value.timeZone !== timeZone ||
    !Array.isArray(value.rows) ||
    value.rows.length > LIMITS.rows ||
    !Array.isArray(value.ranges) ||
    value.ranges.length > 10000 ||
    !Array.isArray(value.pendingDays) ||
    value.pendingDays.length > 10000
  )
    throw new Error('INVALID_CACHE');
  const records = cacheRows(value.rows, { currency, timeZone });
  const verified = value.ranges
    .map((range) => {
      cacheDay(range?.from);
      cacheDay(range?.to);
      if (range.from > range.to) throw new Error('INVALID_CACHE');
      return { from: range.from, to: range.to > today ? today : range.to };
    })
    .filter((range) => range.from <= range.to);
  // v3 deliberately omitted pending/recent rows. Retain its visible records,
  // then rebuild requested coverage once so omitted rows are not lost.
  const ranges = value.schema === 4 ? verified : [];
  const pendingDays = value.pendingDays.map(cacheDay);
  return { records: mergeExports([{ records }]), ranges, pendingDays };
}
export function updateSnapshot(
  previous,
  { records, recordRows, range, currency, timeZone, today },
) {
  const incoming = recordRows || records;
  cacheContext({ currency, timeZone, today });
  cacheDay(range?.from);
  cacheDay(range?.to);
  if (
    range.from > range.to ||
    range.to > today ||
    (records && recordRows) ||
    !Array.isArray(incoming) ||
    incoming.length > LIMITS.rows
  )
    throw new Error('INVALID_CACHE');
  const old = readSnapshot(previous, { currency, timeZone, today });
  const validated = cacheRows(recordRows ? incoming : incoming.map(pack), { currency, timeZone });
  if (validated.some((r) => r.currency !== currency || r.day < range.from || r.day > range.to))
    throw new Error('INVALID_CACHE');
  const kept = old.records.filter((r) => r.day < range.from || r.day > range.to);
  const merged = mergeExports([{ records: kept }, { records: validated }]);
  validateLedger(merged);
  const pendingDays = [
    ...new Set([
      ...old.pendingDays.filter((day) => day < range.from || day > range.to),
      ...validated.filter(needsRecheck).map((r) => r.day),
    ]),
  ].sort();
  const ranges = [...old.ranges, { from: range.from, to: range.to }];
  // Compact overlapping coverage intervals, including empty historical days.
  const compact = [];
  for (const r of ranges.sort((a, b) => a.from.localeCompare(b.from))) {
    const last = compact.at(-1);
    if (last && r.from <= shiftDay(last.to, 1)) {
      if (r.to > last.to) last.to = r.to;
    } else compact.push({ ...r });
  }
  const result = {
    schema: 4,
    currency,
    timeZone,
    rows: merged.map(pack),
    ranges: compact,
    pendingDays,
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > LIMITS.bytes)
    throw new Error('FILE_TOO_LARGE');
  return result;
}
