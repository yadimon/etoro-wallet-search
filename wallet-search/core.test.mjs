import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  decodeExport,
  parseDelimited,
  parseMinor,
  parseDate,
  localDay,
  parseExport,
  mergeExports,
  filterRecords,
  summarize,
  monthRange,
  missingRanges,
} from './core.mjs';
const header =
  'Name\tDate\tAmount\tCurrency\tLocal Amount\tLocal Currency\tExchange Rate\tMoney Out\tMoney In';
const line = (name, date, amount, currency = 'EUR') =>
  [
    name,
    date,
    amount,
    currency,
    amount,
    currency,
    '1',
    amount < 0 ? amount : '',
    amount > 0 ? amount : '',
  ].join('\t');
const parse = (rows) => parseExport([header, ...rows].join('\n'), { timeZone: 'Europe/Berlin' });

test('CSV quoting, escaped quotes, multiline values, semicolons, UTF-16', () => {
  assert.deepEqual(
    parseDelimited('\uFEFFsep=;\r\nName;Date;Amount\r\n"A; ""B""\nC";01/01/2026;-1,23').rows[1],
    ['A; "B"\nC', '01/01/2026', '-1,23'],
  );
  assert.equal(decodeExport(Buffer.from('\uFEFFName\tDate', 'utf16le')), 'Name\tDate');
  assert.throws(() => parseDelimited('Name,Date\n"unfinished'), /MALFORMED_QUOTES/);
});
test('amounts use exact cents, locale separators, signs and zero', () => {
  for (const [value, expected] of [
    ['-€1,287.72', -128772],
    ['1.287,72 €', 128772],
    ['1\u202f287,72', 128772],
    ['(150.00)', -15000],
    ['0', 0],
    ['1,234', 123400],
    ['-.9', -90],
    ['.05', 5],
  ])
    assert.equal(parseMinor(value), expected);
  assert.equal(parseMinor(''), null);
  for (const invalid of ['NaN', '1.1234', '0.123', '123-4', '<img>', '12,34.56', '12.34,56'])
    assert.throws(() => parseMinor(invalid));
});
test('eToro unzoned timestamps are UTC; Berlin midnight and month boundaries', () => {
  const parsed = parse([line('Late payment', '31/01/2026 23:30:00', -10)]);
  assert.equal(parsed.records[0].day, '2026-02-01');
  assert.equal(summarize(parsed.records, '2026-01').size, 0);
  assert.equal(summarize(parsed.records, '2026-02').get('EUR').outgoing, 1000);
  assert.equal(filterRecords(parsed.records, { from: '2026-02-01', to: '2026-02-01' }).length, 1);
  assert.equal(
    localDay(parseDate('2026-07-31T22:30:00Z').timestamp, 'Europe/Berlin'),
    '2026-08-01',
  );
  assert.equal(
    localDay(parseDate('2026-03-01T00:30:00Z').timestamp, 'America/New_York'),
    '2026-02-28',
  );
});
test('DST, explicit offsets, leap dates and calendar-only CSV dates', () => {
  assert.equal(
    parseDate('2026-10-24T12:00:00.1234567Z').timestamp,
    Date.UTC(2026, 9, 24, 12, 0, 0, 123),
  );
  assert.equal(localDay(parseDate('29/03/2026 01:30:00').timestamp, 'Europe/Berlin'), '2026-03-29');
  assert.equal(parseDate('2026-10-25T02:30:00+02:00').timestamp, Date.UTC(2026, 9, 25, 0, 30));
  assert.equal(parseDate('2026-10-25T02:30:00+01:00').timestamp, Date.UTC(2026, 9, 25, 1, 30));
  assert.throws(() => parseDate('29/02/2026'), /INVALID_DATE/);
  assert.equal(parseDate('29/02/2024').calendarDay, '2024-02-29');
  const result = parseExport('Name,Date,Amount,Currency\nA,2026-01-01,-1,EUR', {
    timeZone: 'America/Los_Angeles',
  });
  assert.equal(result.records[0].day, '2026-01-01');
});
test('real export schema and money-out sign; no original-currency double counting', () => {
  const rows = parse([
    [
      'Merchant',
      '01/10/2026 10:00:00',
      '-22.21',
      'EUR',
      '-25.11',
      'USD',
      '1.13',
      '-22.21',
      '',
    ].join('\t'),
  ]);
  assert.equal(rows.records[0].minor, -2221);
  assert.equal(rows.records[0].localMinor, -2511);
  assert.equal(rows.profile, 'etoro-wallet-tsv-v1');
  assert.throws(
    () => parse([['A', '01/01/2026', '-10', 'EUR', '-10', 'EUR', '1', '-20', ''].join('\t')]),
    /INCONSISTENT_AMOUNT/,
  );
  assert.throws(() => parse([line('A', '31/02/2026', -10)]), /ROW_2:INVALID_DATE/);
});
test('overlapping exports preserve identical legitimate payments without multiplying imports', () => {
  const row = line('Same merchant', '01/10/2026 10:00:00', -10);
  const a = parse([row, row]),
    b = parse([row]);
  assert.equal(mergeExports([a, b, a]).length, 2);
  assert.equal(summarize(mergeExports([a, b, a])).get('EUR').outgoing, 2000);
});
test('text, inclusive local dates, directions and strict amount comparisons', () => {
  const rows = mergeExports([
    parse([
      line('Café One', '01/10/2026 10:00:00', -10),
      line('Cafe One', '02/10/2026 10:00:00', -20),
      line('Salary', '03/10/2026 10:00:00', 100),
    ]),
  ]);
  assert.equal(
    filterRecords(rows, { query: 'cafe one', direction: 'out', amountOp: 'gt', amount: 1000 })
      .length,
    1,
  );
  assert.equal(filterRecords(rows, { from: '2026-10-01', to: '2026-10-01' }).length, 1);
  assert.equal(filterRecords(rows, { direction: 'in' }).length, 1);
  assert.equal(filterRecords(rows, { amountOp: 'lt', amount: 1000 }).length, 0);
  assert.equal(
    filterRecords(rows, { amountOp: 'between', amount: 1000, amountTo: 2000 }).length,
    2,
  );
  assert.equal(summarize(rows).get('EUR').net, 7000);
});
test('currencies are never summed together', () => {
  const rows = mergeExports([
    parse([line('A', '01/10/2026', -10, 'EUR'), line('B', '01/10/2026', 20, 'GBP')]),
  ]);
  const summary = summarize(rows);
  assert.equal(summary.size, 2);
  assert.equal(summary.get('EUR').net, -1000);
  assert.equal(summary.get('GBP').net, 2000);
});
test('coverage and leap-month ranges avoid redundant downloads', () => {
  assert.deepEqual(monthRange('2024-02'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(
    missingRanges('2026-01-01', '2026-01-31', [
      { from: '2026-01-01', to: '2026-01-10' },
      { from: '2026-01-20', to: '2026-01-31' },
    ]),
    [{ from: '2026-01-11', to: '2026-01-19' }],
  );
  assert.deepEqual(
    missingRanges('2026-01-01', '2026-01-31', [{ from: '2007-01-01', to: '2026-10-24' }]),
    [],
  );
});
test('input and merged record limits are enforced before accepting too much data', () => {
  assert.throws(() => decodeExport(new Uint8Array(LIMITS.bytes + 1)), /FILE_TOO_LARGE/);
  assert.throws(
    () => parseDelimited('Name,Date\n' + 'a,b\n'.repeat(LIMITS.rows + 1)),
    /TOO_MANY_ROWS/,
  );
  const records = Array.from({ length: LIMITS.rows + 1 }, (_, i) => ({
    fingerprint: String(i),
    timestamp: i,
  }));
  assert.throws(() => mergeExports([{ records }]), /TOO_MANY_ROWS/);
});
