// Pure data layer. No DOM, requests, credentials, or persistent storage.
export const LIMITS = Object.freeze({ bytes: 32 * 1024 * 1024, rows: 200_000 });

export function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeExport(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
  if (bytes[0] === 255 && bytes[1] === 254) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 254 && bytes[1] === 255) return new TextDecoder('utf-16be').decode(bytes);
  // Some spreadsheet exports omit the UTF-16 BOM.
  const sample = bytes.slice(0, Math.min(256, bytes.length));
  if (sample.filter((v, i) => i % 2 === 1 && v === 0).length > sample.length / 5)
    return new TextDecoder('utf-16le').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function parseDelimited(input) {
  let text = String(input).replace(/^\uFEFF/, '');
  if (text.length > LIMITS.bytes) throw new Error('FILE_TOO_LARGE');
  let separator;
  const directive = text.match(/^sep=([;,\t])\r?\n/i);
  if (directive) {
    separator = directive[1];
    text = text.slice(directive[0].length);
  }
  if (!separator) {
    const counts = { '\t': 0, ';': 0, ',': 0 };
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && (c === '\n' || c === '\r')) break;
      else if (!quoted && Object.hasOwn(counts, c)) counts[c]++;
    }
    separator = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    if (!counts[separator]) throw new Error('UNRECOGNIZED_HEADER');
  }
  const rows = [];
  let row = [],
    field = '',
    quoted = false,
    closed = false;
  const push = () => {
    row.push(field);
    field = '';
    closed = false;
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > LIMITS.rows + 1) throw new Error('TOO_MANY_ROWS');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"' && field === '' && !closed) quoted = true;
    else if (c === separator) {
      row.push(field);
      field = '';
      closed = false;
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      push();
    } else {
      if (closed && !/\s/.test(c)) throw new Error('MALFORMED_QUOTES');
      field += c;
    }
  }
  if (quoted) throw new Error('MALFORMED_QUOTES');
  if (field || row.length) push();
  if (!rows.length) throw new Error('UNRECOGNIZED_HEADER');
  return { separator, rows };
}

// Integer cents prevent floating-point errors in totals and comparisons.
export function parseMinor(input) {
  let text = String(input ?? '').trim();
  if (!text || /^[-–—]$/.test(text)) return null;
  text = text
    .replace(/\u2212/g, '-')
    .replace(/[€$£¥]/g, '')
    .replace(/\b[A-Z]{3}\b/g, '')
    .replace(/[\s'’]/g, '');
  if (/^\(.*\)$/.test(text)) text = '-' + text.slice(1, -1);
  text = text.replace(/^([+-]?)([.,])(?=\d)/, (_, sign, separator) => `${sign}0${separator}`);
  if (!/^[+-]?\d[\d.,]*$/.test(text)) throw new Error('INVALID_AMOUNT');
  const negative = text.startsWith('-');
  text = text.replace(/^[+-]/, '');
  const dot = text.lastIndexOf('.'),
    comma = text.lastIndexOf(',');
  let decimal = '';
  if (dot >= 0 && comma >= 0) decimal = dot > comma ? '.' : ',';
  else {
    const sep = dot >= 0 ? '.' : comma >= 0 ? ',' : '';
    if (sep) {
      const parts = text.split(sep);
      if (parts.length === 2 && parts[1].length <= 2) decimal = sep;
      else if (!parts.slice(1).every((part) => part.length === 3) || parts[0] === '0')
        throw new Error('INVALID_AMOUNT');
    }
  }
  let whole, fraction;
  if (decimal) {
    const at = text.lastIndexOf(decimal);
    const integer = text.slice(0, at);
    const grouping = decimal === '.' ? ',' : '.';
    if (
      integer.includes(grouping) &&
      !new RegExp(`^\\d{1,3}(?:\\${grouping}\\d{3})+$`).test(integer)
    )
      throw new Error('INVALID_AMOUNT');
    whole = integer.replace(/[.,]/g, '');
    fraction = text.slice(at + 1);
    if (!/^\d{1,2}$/.test(fraction)) throw new Error('INVALID_AMOUNT');
  } else {
    whole = text.replace(/[.,]/g, '');
    fraction = '';
  }
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(value)) throw new Error('AMOUNT_OVERFLOW');
  return negative ? -value : value;
}

export function parseDate(input, { order = 'dmy' } = {}) {
  const text = String(input ?? '').trim();
  const iso = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/i,
  );
  const other =
    !iso &&
    text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!iso && !other) throw new Error('INVALID_DATE');
  const match = iso || other;
  const year = Number(iso ? match[1] : match[3]);
  const month = Number(iso ? match[2] : match[order === 'mdy' ? 1 : 2]);
  const day = Number(iso ? match[3] : match[order === 'mdy' ? 2 : 1]);
  const hour = Number(match[4] || 0),
    minute = Number(match[5] || 0),
    second = Number(match[6] || 0);
  const millis = iso ? Number((match[7] || '').slice(0, 3).padEnd(3, '0')) : 0;
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millis));
  if (
    year < 1900 ||
    year > 2200 ||
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() + 1 !== month ||
    utc.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    throw new Error('INVALID_DATE');
  let timestamp = utc.getTime();
  const offset = iso && match[8];
  if (offset && offset.toUpperCase() !== 'Z') {
    const pieces = offset.match(/^([+-])(\d{2}):?(\d{2})$/);
    if (Number(pieces[2]) > 14 || Number(pieces[3]) > 59) throw new Error('INVALID_DATE');
    timestamp -=
      (pieces[1] === '+' ? 1 : -1) * (Number(pieces[2]) * 60 + Number(pieces[3])) * 60000;
  }
  // A date without a time is a calendar day, not a UTC instant.
  return {
    timestamp,
    dateOnly: !match[4],
    calendarDay: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

const dateFormatters = new Map();
export function localDay(timestamp, timeZone) {
  if (!dateFormatters.has(timeZone))
    dateFormatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  const parts = Object.fromEntries(
    dateFormatters
      .get(timeZone)
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const aliases = {
  name: [
    'name',
    'description',
    'merchant',
    'merchantname',
    'beschreibung',
    'verwendungszweck',
    'название',
    'описание',
    'магазин',
  ],
  date: ['date', 'datetime', 'transactiondate', 'datum', 'zeitpunkt', 'дата', 'датавремя'],
  amount: ['amount', 'betrag', 'сумма'],
  currency: ['currency', 'wahrung', 'валюта'],
  out: ['moneyout', 'debit', 'outgoing', 'ausgang', 'ausgaben', 'расход', 'списание'],
  in: ['moneyin', 'credit', 'incoming', 'eingang', 'einnahmen', 'приход', 'поступление'],
  localAmount: ['localamount', 'lokalerbetrag', 'местнаясумма'],
  localCurrency: ['localcurrency', 'lokalewahrung', 'местнаявалюта'],
  id: ['transactionid', 'id', 'transaktionsid', 'идентификатор'],
};
const headerKey = (value) => normalize(value).replace(/[^\p{L}\p{N}]/gu, '');
export function exportRange(fileName = '') {
  const match = fileName.match(
    /eToroTransactions_(\d{2})-(\d{2})-(\d{4})_(\d{2})-(\d{2})-(\d{4})/i,
  );
  if (!match) return null;
  try {
    return {
      from: parseDate(`${match[1]}/${match[2]}/${match[3]}`).calendarDay,
      to: parseDate(`${match[4]}/${match[5]}/${match[6]}`).calendarDay,
    };
  } catch {
    return null;
  }
}

export function parseExport(
  text,
  {
    fileName = '',
    currency = 'EUR',
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateOrder = 'dmy',
  } = {},
) {
  const parsed = parseDelimited(text);
  const headers = parsed.rows[0].map(headerKey);
  const columns = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((header) => names.includes(header)),
    ]),
  );
  if (
    columns.name < 0 ||
    columns.date < 0 ||
    (columns.amount < 0 && columns.in < 0 && columns.out < 0)
  )
    throw new Error('UNRECOGNIZED_HEADER');
  const nativeProfile = [
    'name',
    'date',
    'amount',
    'currency',
    'localamount',
    'localcurrency',
    'exchangerate',
    'moneyout',
    'moneyin',
  ].every((key, i) => headers[i] === key);
  const records = [];
  for (let index = 1; index < parsed.rows.length; index++) {
    const cells = parsed.rows[index];
    try {
      if (cells.length !== headers.length) throw new Error('COLUMN_COUNT');
      const get = (key) => (columns[key] < 0 ? '' : cells[columns[key]].trim());
      const name = get('name');
      if (!name) throw new Error('MISSING_NAME');
      const date = parseDate(get('date'), { order: dateOrder });
      let minor = parseMinor(get('amount'));
      const outgoing = parseMinor(get('out')),
        incoming = parseMinor(get('in'));
      if (outgoing !== null || incoming !== null) {
        const net = Math.abs(incoming || 0) - Math.abs(outgoing || 0);
        if (minor !== null && minor !== net) throw new Error('INCONSISTENT_AMOUNT');
        minor = net;
      }
      if (minor === null) throw new Error('MISSING_AMOUNT');
      const rowCurrency = (get('currency') || currency).toUpperCase();
      if (!/^[A-Z]{3}$/.test(rowCurrency)) throw new Error('INVALID_CURRENCY');
      const localMinor = parseMinor(get('localAmount'));
      if (get('localCurrency') && !/^[A-Z]{3}$/i.test(get('localCurrency')))
        throw new Error('INVALID_CURRENCY');
      const day = date.dateOnly ? date.calendarDay : localDay(date.timestamp, timeZone);
      const record = {
        name,
        timestamp: date.timestamp,
        dateOnly: date.dateOnly,
        day,
        month: day.slice(0, 7),
        minor,
        currency: rowCurrency,
        localMinor,
        localCurrency: get('localCurrency').toUpperCase(),
        source: fileName,
        id: get('id'),
        search: normalize(name),
      };
      record.fingerprint = record.id
        ? JSON.stringify([rowCurrency, record.id])
        : JSON.stringify([
            record.name,
            record.timestamp,
            record.dateOnly,
            minor,
            rowCurrency,
            localMinor,
            record.localCurrency,
          ]);
      records.push(record);
    } catch (error) {
      throw new Error(`ROW_${index + 1}:${error.message}`);
    }
  }
  return {
    records,
    fileName,
    range: exportRange(fileName),
    separator: parsed.separator,
    profile: nativeProfile ? 'etoro-wallet-tsv-v1' : 'mapped-columns-v1',
    timeZone,
    timeBasis: 'UTC',
    headers: parsed.rows[0],
  };
}

// CSV has no transaction ID. Preserve duplicate payments within an export, while
// avoiding multiplication when overlapping exports are imported repeatedly.
export function mergeExports(batches) {
  const grouped = new Map();
  for (const batch of batches) {
    const occurrences = new Map();
    for (const record of batch.records) {
      const count = (occurrences.get(record.fingerprint) || 0) + 1;
      occurrences.set(record.fingerprint, count);
      const key = `${record.fingerprint}#${count}`;
      grouped.set(key, { ...record, key });
      if (grouped.size > LIMITS.rows) throw new Error('TOO_MANY_ROWS');
    }
  }
  return [...grouped.values()].sort(
    (a, b) => b.timestamp - a.timestamp || a.key.localeCompare(b.key),
  );
}

export function filterRecords(
  records,
  {
    query = '',
    from = '',
    to = '',
    direction = 'all',
    amountOp = 'any',
    amount = null,
    amountTo = null,
  } = {},
) {
  const words = normalize(query).split(' ').filter(Boolean);
  return records.filter((row) => {
    if ((from && row.day < from) || (to && row.day > to)) return false;
    if ((direction === 'in' && row.minor <= 0) || (direction === 'out' && row.minor >= 0))
      return false;
    if (words.some((word) => !row.search.includes(word))) return false;
    const value = Math.abs(row.minor);
    if (amountOp !== 'any' && amount !== null) {
      const target = Math.abs(amount);
      if (
        (amountOp === 'gt' && !(value > target)) ||
        (amountOp === 'gte' && value < target) ||
        (amountOp === 'lt' && !(value < target)) ||
        (amountOp === 'lte' && value > target) ||
        (amountOp === 'eq' && value !== target) ||
        (amountOp === 'between' &&
          (value < target || amountTo === null || value > Math.abs(amountTo)))
      )
        return false;
    }
    return true;
  });
}

export function summarize(records, month = '') {
  const currencies = new Map();
  for (const row of records) {
    if (month && row.month !== month) continue;
    if (!currencies.has(row.currency))
      currencies.set(row.currency, { incoming: 0, outgoing: 0, net: 0, count: 0 });
    const summary = currencies.get(row.currency);
    if (row.minor > 0) summary.incoming += row.minor;
    if (row.minor < 0) summary.outgoing -= row.minor;
    summary.net += row.minor;
    summary.count++;
    if (![summary.incoming, summary.outgoing, summary.net].every(Number.isSafeInteger))
      throw new Error('AMOUNT_OVERFLOW');
  }
  return currencies;
}

export function shiftDay(day, delta) {
  const parsed = parseDate(day);
  return new Date(parsed.timestamp + delta * 86400000).toISOString().slice(0, 10);
}
export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('INVALID_DATE');
  const [year, number] = month.split('-').map(Number);
  return {
    from: `${month}-01`,
    to: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10),
  };
}
export function missingRanges(from, to, ranges) {
  if (from > to) throw new Error('INVALID_RANGE');
  let cursor = from;
  const gaps = [];
  for (const range of [...ranges]
    .filter((r) => r && r.to >= from && r.from <= to)
    .sort((a, b) => a.from.localeCompare(b.from))) {
    if (range.from > cursor) gaps.push({ from: cursor, to: shiftDay(range.from, -1) });
    if (range.to >= cursor) cursor = shiftDay(range.to, 1);
    if (cursor > to) break;
  }
  if (cursor <= to) gaps.push({ from: cursor, to });
  return gaps;
}
