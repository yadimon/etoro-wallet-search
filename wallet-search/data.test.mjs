import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nativeRecords,
  CATEGORIES,
  ledgerTotals,
  validateLedger,
  monthlyLayers,
  pendingFrom,
  cachePlan,
  automaticRefreshRange,
  updateSnapshot,
  readSnapshot,
  cacheScopeValue,
  fallbackRecords,
} from './data.mjs';
import { TRANSLATIONS, LOCALES, resolveLanguage } from './i18n.mjs';
const context = { currency: 'EUR', timeZone: 'Europe/Berlin' },
  today = '2026-10-24',
  range = { from: '2007-01-01', to: today };
const item = (id, time, amount, type = 1, status = 0) => ({
  transactionId: id,
  label: `Test ${id}`,
  transactionTime: time,
  amount,
  currency: 978,
  customerTransactionType: type,
  transactionAnnotation: status,
});
const parse = (rows) =>
  nativeRecords({ transactions: rows, next: null, hasMoreRecords: false }, context).records;
test('native types and annotations distinguish actual payments, transfers, cash and failed attempts', () => {
  const rows = parse([
    item('pay', '2026-10-01T10:00:00Z', -10),
    item('in', '2026-10-02T10:00:00Z', 100, 7),
    item('out', '2026-10-03T10:00:00Z', -50, 6),
    item('cash', '2026-10-04T10:00:00Z', -20, 4),
    item('failed', '2026-10-05T10:00:00Z', -90, 1, 3),
    item('pending', '2026-10-06T10:00:00Z', -40, 1, 1),
  ]);
  assert.deepEqual(
    rows.map((r) => r.category),
    ['payments', 'transferIn', 'transferOut', 'cash', 'payments', 'payments'],
  );
  assert.deepEqual(ledgerTotals(rows), {
    incoming: 10000,
    outgoing: 8000,
    net: 2000,
    count: 4,
    pending: 1,
    failed: 1,
    unknown: 0,
  });
  assert.equal(ledgerTotals(rows, { categories: ['payments'] }).outgoing, 1000);
});
test('unknown enum values are never silently counted as settled card spending', () => {
  const rows = parse([item('unknown', '2026-10-01T10:00:00Z', -10, 999, 999)]);
  assert.equal(rows[0].category, 'otherOut');
  assert.equal(rows[0].status, 'unknown');
  assert.equal(ledgerTotals(rows).outgoing, 0);
  assert.equal(fallbackRecords(rows)[0].status, 'unknown');
});

test('inherited and non-integer enum names never become trusted categories or statuses', () => {
  for (const value of ['__proto__', 'constructor', 'toString', '1', null, true, {}, [], 1.5]) {
    const [row] = parse([item('untrusted', '2026-10-01T10:00:00Z', -10, value, value)]);
    assert.equal(row.category, 'otherOut');
    assert.equal(row.status, 'unknown');
  }
});

test('malformed pagination cannot silently mark an incomplete period as complete', () => {
  for (const hasMoreRecords of [undefined, null, 0, 1, 'false', 'true', {}])
    assert.throws(
      () => nativeRecords({ transactions: [], next: 'cursor', hasMoreRecords }, context),
      /INVALID_NATIVE_DATA/,
    );
  for (const next of [{}, [], 42])
    assert.throws(
      () => nativeRecords({ transactions: [], next, hasMoreRecords: true }, context),
      /INVALID_NATIVE_DATA/,
    );
  assert.throws(
    () => nativeRecords({ transactions: [], next: '', hasMoreRecords: true }, context),
    /INVALID_NATIVE_DATA/,
  );
});

test('all-status overflow is rejected before replacing good memory or cache data', () => {
  const rows = [
    { minor: Number.MAX_SAFE_INTEGER, status: 'pending' },
    { minor: 1, status: 'failed' },
  ];
  assert.throws(() => validateLedger(rows), /AMOUNT_OVERFLOW/);
  const records = parse([item('one', '2026-10-01T10:00:00Z', -1)]);
  const good = updateSnapshot(null, { records, range, ...context, today }),
    before = structuredClone(good);
  const incoming = structuredClone(records[0]);
  incoming.id = 'two';
  incoming.minor = Number.MAX_SAFE_INTEGER;
  incoming.status = 'pending';
  assert.throws(
    () =>
      updateSnapshot(good, {
        records: [{ ...incoming, id: 'three', minor: 1 }, incoming],
        range,
        ...context,
        today,
      }),
    /AMOUNT_OVERFLOW/,
  );
  assert.deepEqual(good, before);
});

test('cache rejects timestamp ranges, wrong currencies and malformed compact fields', () => {
  const records = parse([item('cache', '2026-10-01T10:00:00Z', -1)]),
    snapshot = updateSnapshot(null, { records, range, ...context, today });
  for (const invalid of [
    (value) => {
      value.ranges[0].from = '2026-10-01T00:00:00Z';
    },
    (value) => {
      value.pendingDays = ['2026-10-01T00:00:00Z'];
    },
    (value) => {
      value.rows[0][4] = 'GBP';
    },
    (value) => {
      value.rows[0][6] = 'x'.repeat(5000);
    },
    (value) => {
      value.rows[0][9] = true;
    },
  ]) {
    const value = structuredClone(snapshot);
    invalid(value);
    assert.throws(() => readSnapshot(value, { ...context, today }), /INVALID_CACHE/);
  }
  assert.throws(
    () =>
      updateSnapshot(snapshot, {
        records,
        range: { from: '2026-10-01T00:00:00Z', to: today },
        ...context,
        today,
      }),
    /INVALID_CACHE/,
  );
  assert.throws(
    () =>
      updateSnapshot(snapshot, {
        records,
        range: { from: '2026-10-01', to: '2026-10-25' },
        ...context,
        today,
      }),
    /INVALID_CACHE/,
  );
  assert.throws(
    () =>
      updateSnapshot(snapshot, { records, recordRows: snapshot.rows, range, ...context, today }),
    /INVALID_CACHE/,
  );
});
test('monthly chart layers can hide transfers and show failures without changing financial totals', () => {
  const rows = parse([
    item('p', '2026-10-01T10:00:00Z', -10),
    item('t', '2026-10-02T10:00:00Z', -500, 6),
    item('f', '2026-10-03T10:00:00Z', -90, 1, 9),
  ]);
  assert.equal(monthlyLayers(rows, 2026)[9].totalOut, 51000);
  const onlyPayments = monthlyLayers(rows, 2026, {
    categories: ['payments'],
    statuses: ['settled', 'failed'],
  });
  assert.equal(onlyPayments[9].totalOut, 10000);
  assert.equal(onlyPayments[9].outgoing.length, 2);
  assert.equal(ledgerTotals(rows, { categories: ['payments'] }).outgoing, 1000);
  assert.equal(onlyPayments[0].totalIn, 0);
});
test('cache persists all fetched records while only pending rows within 42 days extend revalidation', () => {
  const rows = parse([
    item('stable', '2026-10-17T10:00:00Z', -10),
    item('recent', '2026-10-24T10:00:00Z', -20),
    item('oldpending', '2026-09-01T10:00:00Z', -30, 8, 8),
    item('activepending', '2026-09-20T10:00:00Z', -40, 1, 1),
  ]);
  const snapshot = updateSnapshot(null, { records: rows, range, ...context, today });
  assert.equal(pendingFrom(today), '2026-09-12');
  assert.equal(snapshot.schema, 4);
  const decoded = readSnapshot(snapshot, { ...context, today });
  assert.equal(decoded.records.length, 4);
  assert.deepEqual(decoded.pendingDays, ['2026-09-01', '2026-09-20']);
  assert.equal(decoded.ranges[0].to, today);
  assert.deepEqual(cachePlan(range, decoded.ranges, today, decoded.pendingDays), {
    from: '2026-09-20',
    to: today,
  });
  assert.equal(decoded.records.find((r) => r.id === 'oldpending').status, 'pending');
  assert.equal(
    cachePlan({ from: '2025-01-01', to: '2025-12-31' }, decoded.ranges, today, decoded.pendingDays),
    null,
  );
});
test('authoritative cache updates settle old pending records, keep other periods and preserve duplicates', () => {
  const old = parse([
    item('a', '2025-01-01T10:00:00Z', -10),
    item('b', '2026-09-20T10:00:00Z', -30, 8, 8),
    item('removed', '2026-09-21T10:00:00Z', -15, 1, 1),
  ]);
  let snapshot = updateSnapshot(null, { records: old, range, ...context, today });
  snapshot = updateSnapshot(snapshot, {
    records: parse([
      item('b', '2026-09-20T10:00:00Z', -30, 8, 0),
      item('same1', '2026-09-22T10:00:00Z', -10),
      item('same2', '2026-09-22T10:00:00Z', -10),
    ]),
    range: { from: '2026-09-20', to: '2026-09-30' },
    ...context,
    today,
  });
  const data = readSnapshot(snapshot, { ...context, today });
  assert.equal(data.records.length, 4);
  assert.deepEqual(data.pendingDays, []);
  assert.equal(data.records.find((r) => r.id === 'b').status, 'settled');
  assert.ok(!data.records.some((r) => r.id === 'removed'));
  assert.deepEqual(cachePlan(range, data.ranges, today), { from: today, to: today });
});
test('automatic refresh starts at the newest checkpoint and leaves historical gaps alone', () => {
  assert.deepEqual(automaticRefreshRange([{ from: '2026-01-01', to: '2026-10-23' }], today), {
    from: '2026-10-23',
    to: today,
  });
  assert.deepEqual(automaticRefreshRange([{ from: '2026-10-01', to: today }], today), {
    from: today,
    to: today,
  });
  assert.deepEqual(
    automaticRefreshRange([{ from: '2026-10-01', to: today }], today, [
      '2026-09-12',
      '2026-09-11',
      '2026-09-30',
    ]),
    { from: '2026-09-12', to: today },
  );
  assert.deepEqual(
    automaticRefreshRange(
      [
        { from: '2025-01-01', to: '2025-12-31' },
        { from: '2026-09-01', to: '2026-10-20' },
      ],
      today,
    ),
    { from: '2026-10-20', to: today },
  );
  assert.deepEqual(automaticRefreshRange([{ from: '2026-01-01', to: '2026-07-01' }], today), {
    from: '2026-07-01',
    to: today,
  });
  assert.deepEqual(automaticRefreshRange([], today), { from: '2007-01-01', to: today });
});

test('incremental loading overlaps the last fetched date and never limits new history to 42 days', () => {
  assert.deepEqual(cachePlan(range, [{ from: range.from, to: '2026-10-10' }], today), {
    from: '2026-10-10',
    to: today,
  });
  assert.deepEqual(cachePlan(range, [{ from: range.from, to: '2026-07-01' }], today), {
    from: '2026-07-01',
    to: today,
  });
  assert.deepEqual(cachePlan(range, [range], today), { from: today, to: today });
});
test('pending revalidation includes the 42-day boundary and ignores older markers without changing status', () => {
  assert.deepEqual(cachePlan(range, [range], today, ['2026-09-11', '2026-09-12']), {
    from: '2026-09-12',
    to: today,
  });
  assert.deepEqual(cachePlan(range, [range], today, ['2026-09-11']), { from: today, to: today });
  assert.equal(
    cachePlan({ from: '2026-09-01', to: '2026-09-11' }, [range], today, ['2026-09-11']),
    null,
  );
});
test('unknown statuses are also revalidated within the bounded window without becoming booked', () => {
  const rows = parse([item('unknown', '2026-10-01T10:00:00Z', -10, 1, 999)]),
    snapshot = updateSnapshot(null, { records: rows, range, ...context, today });
  const data = readSnapshot(snapshot, { ...context, today });
  assert.deepEqual(data.pendingDays, ['2026-10-01']);
  assert.deepEqual(cachePlan(range, data.ranges, today, data.pendingDays), {
    from: '2026-10-01',
    to: today,
  });
  assert.equal(data.records[0].status, 'unknown');
  assert.equal(ledgerTotals(data.records).outgoing, 0);
});
test('v3 cache migration retains its visible records and rebuilds coverage to recover previously omitted rows', () => {
  const rows = parse([
    item('stable', '2026-10-10T10:00:00Z', -10),
    item('pending', '2026-09-01T10:00:00Z', -20, 1, 1),
  ]);
  const legacy = {
    ...updateSnapshot(null, { records: rows, range, ...context, today }),
    schema: 3,
  };
  legacy.rows = legacy.rows.filter((cells) => cells[0] === 'stable');
  const decoded = readSnapshot(legacy, { ...context, today });
  assert.equal(decoded.records.length, 1);
  assert.deepEqual(decoded.ranges, []);
  assert.deepEqual(cachePlan(range, decoded.ranges, today, decoded.pendingDays), range);
  const upgraded = updateSnapshot(legacy, { records: rows, range, ...context, today });
  assert.equal(upgraded.schema, 4);
  assert.equal(upgraded.rows.length, 2);
  assert.deepEqual(readSnapshot(upgraded, { ...context, today }).ranges, [range]);
});
test('cache scope and local day policy remain distinct across accounts, currencies and time zones', () => {
  const base = { account: 'one', ...context };
  assert.notEqual(cacheScopeValue(base), cacheScopeValue({ ...base, account: 'two' }));
  assert.notEqual(cacheScopeValue(base), cacheScopeValue({ ...base, currency: 'GBP' }));
  assert.notEqual(
    cacheScopeValue(base),
    cacheScopeValue({ ...base, timeZone: 'America/New_York' }),
  );
  assert.equal(pendingFrom('2026-10-28'), '2026-09-16');
  assert.equal(pendingFrom('2026-03-31'), '2026-02-17');
  assert.throws(() => readSnapshot({ schema: 1 }, { ...context, today }), /INVALID_CACHE/);
});
test('all twenty observed eToro languages have complete translations and valid Intl locales', () => {
  assert.equal(Object.keys(TRANSLATIONS).length, 20);
  const keys = Object.keys(TRANSLATIONS.en).sort();
  for (const [lang, dict] of Object.entries(TRANSLATIONS)) {
    assert.deepEqual(Object.keys(dict).sort(), keys, lang);
    assert.ok(Object.values(dict).every((value) => typeof value === 'string' && value.trim()));
    new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR' }).format(1);
    for (const category of CATEGORIES) assert.ok(dict[category]);
  }
  assert.equal(resolveLanguage('zh-Hant'), 'zh-TW');
  assert.equal(resolveLanguage('zh_CN'), 'zh-CN');
  assert.equal(resolveLanguage('no-NO'), 'nb');
  assert.equal(resolveLanguage('el-GR'), 'el');
});
