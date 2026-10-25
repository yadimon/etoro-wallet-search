import {
  test,
  expect,
  openWallet,
  ui,
  search,
  ledgerFor,
  fixtureDate,
  waitForStartup,
  holdNative,
} from './helpers.mjs';
async function snapshots(context) {
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  return worker.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('wallet-search-local-v3', 1);
        request.onsuccess = () => {
          const db = request.result,
            transaction = db.transaction('accounts', 'readonly'),
            read = transaction.objectStore('accounts').getAll();
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
          read.onerror = () => reject(new Error('snapshot read failed'));
        };
        request.onerror = () => reject(new Error('database open failed'));
      }),
  );
}
test('persistent cache restores every fetched record including recent, pending and cancelled entries', async ({
  page,
  extensionContext,
}) => {
  const unique = `cache-${ledgerFor(page).accountId}`;
  ledgerFor(page).rows[1].transactionId = unique;
  await openWallet(page);
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 14,
    cachedRows: 14,
    cacheAvailable: true,
  });
  const snapshot = (await snapshots(extensionContext)).find((s) =>
    s.rows.some((r) => r[0] === unique),
  );
  expect(snapshot.schema).toBe(4);
  expect(snapshot.rows).toHaveLength(14);
  expect(snapshot.rows.filter((r) => ['1', '8', '9', '13'].includes(r[0]))).toHaveLength(4);
  expect(snapshot.pendingDays).toEqual(['2026-09-20', '2026-10-05', '2026-10-23']);
  expect(snapshot.ranges.at(-1).to).toBe('2026-10-24');
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().rows))
    .toBe(14);
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
});
test('historical searches use cache and active pending dates extend the incremental refresh window', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const ledger = ledgerFor(page),
    requests = ledger.requests.length;
  await page.reload();
  await waitForStartup(page);
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().cachedRows))
    .toBe(14);
  await ui(page).getByLabel('Von', { exact: true }).fill('2025-01-01');
  await ui(page).getByLabel('Bis', { exact: true }).fill('2025-12-31');
  await search(page);
  expect(ledger.requests.length).toBe(requests + 1);
  await expect(ui(page).locator('.row-title')).toHaveText('Transfer Test');
  ledger.rows[0].amount = -36;
  await ui(page).getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
  await search(page);
  expect(ledger.requests.length).toBe(requests + 2);
  await ui(page).getByRole('searchbox').fill('Coffee');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-amount')).toContainText('36,00');
});
test('pending transactions within six weeks are replaced when they settle', async ({
  page,
  extensionContext,
}) => {
  const ledger = ledgerFor(page),
    unique = `settling-${ledger.accountId}`;
  ledger.rows.find((r) => r.transactionId === '13').transactionId = unique;
  await openWallet(page);
  await search(page);
  ledger.rows.find((r) => r.transactionId === unique).transactionAnnotation = 0;
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().cachedRows)).toBe(14);
  const snapshot = (await snapshots(extensionContext)).find((s) =>
    s.rows.some((r) => r[0] === unique),
  );
  expect(snapshot.pendingDays).toEqual(['2026-10-05', '2026-10-23']);
  expect(snapshot.rows.find((r) => r[0] === unique)[8]).toBe('settled');
});
test('pending rows older than six weeks keep their status until an explicit full refresh', async ({
  page,
  extensionContext,
}) => {
  const ledger = ledgerFor(page),
    row = ledger.rows.find((r) => r.transactionId === '13');
  row.transactionId = `expired-${ledger.accountId}`;
  row.transactionTime = '2026-09-01T10:00:00Z';
  await openWallet(page);
  await search(page);
  row.transactionAnnotation = 0;
  await search(page);
  let snapshot = (await snapshots(extensionContext)).find((s) =>
    s.rows.some((r) => r[0] === row.transactionId),
  );
  expect(snapshot.rows.find((r) => r[0] === row.transactionId)[8]).toBe('pending');
  await ui(page).getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  snapshot = (await snapshots(extensionContext)).find((s) =>
    s.rows.some((r) => r[0] === row.transactionId),
  );
  expect(snapshot.rows.find((r) => r[0] === row.transactionId)[8]).toBe('settled');
});
test('without pending rows only new dates are processed and older API pages are not requested again', async ({
  page,
}) => {
  const ledger = ledgerFor(page);
  for (const row of ledger.rows) row.transactionAnnotation = 0;
  const base = ledger.rows[0];
  ledger.rows.push(
    ...Array.from({ length: 80 }, (_, i) => ({
      ...base,
      transactionId: `old-${i}`,
      label: `Archive ${i}`,
      transactionTime: '2025-06-01T10:00:00Z',
    })),
  );
  await openWallet(page);
  await search(page);
  const before = ledger.requests.length;
  ledger.rows[0].amount = -36;
  ledger.rows.push({
    ...base,
    transactionId: 'new-today',
    label: 'New today',
    transactionTime: '2026-10-24T10:00:00Z',
    amount: -3,
  });
  await search(page);
  expect(ledger.requests.length).toBe(before + 1);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 95,
    cachedRows: 95,
  });
  await ui(page).getByRole('searchbox').fill('Coffee');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-amount')).toContainText('35,00');
  await ui(page).getByRole('searchbox').fill('New today');
  await expect(ui(page).locator('.row-title')).toHaveText('New today');
});
test('upgrading a v3 browser cache recovers previously omitted pending and recent rows', async ({
  page,
  extensionContext,
}) => {
  const unique = `legacy-${ledgerFor(page).accountId}`;
  ledgerFor(page).rows[1].transactionId = unique;
  await openWallet(page);
  await search(page);
  const worker =
    extensionContext.serviceWorkers()[0] || (await extensionContext.waitForEvent('serviceworker'));
  await worker.evaluate(
    (id) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('wallet-search-local-v3', 1);
        request.onerror = () => reject(new Error('open failed'));
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('accounts', 'readwrite'),
            store = tx.objectStore('accounts');
          let found = false;
          const scan = store.openCursor();
          scan.onsuccess = () => {
            const cursor = scan.result;
            if (!cursor) return;
            if (!cursor.value.rows.some((row) => row[0] === id)) {
              cursor.continue();
              return;
            }
            const legacy = { ...cursor.value, schema: 3 };
            legacy.rows = legacy.rows.filter(
              (row) => row[8] !== 'pending' && row[2] < Date.parse('2026-10-18T00:00:00Z'),
            );
            legacy.ranges = [{ from: '2007-01-01', to: '2026-10-17' }];
            cursor.update(legacy);
            found = true;
          };
          tx.oncomplete = () => {
            db.close();
            found ? resolve() : reject(new Error('missing fixture snapshot'));
          };
          tx.onerror = () => reject(new Error('write failed'));
        };
      }),
    unique,
  );
  await page.reload();
  await waitForStartup(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 14,
    cachedRows: 14,
  });
  const upgraded = (await snapshots(extensionContext)).find((s) =>
    s.rows.some((r) => r[0] === unique),
  );
  expect(upgraded.schema).toBe(4);
  expect(upgraded.rows.filter((row) => row[8] === 'pending')).toHaveLength(2);
});
test('an unsuccessful refresh preserves both the visible dataset and persistent snapshot', async ({
  page,
  extensionContext,
}) => {
  const unique = `retain-${ledgerFor(page).accountId}`;
  ledgerFor(page).rows[1].transactionId = unique;
  await openWallet(page);
  await search(page);
  const before = (await snapshots(extensionContext)).find((s) =>
    s.rows.some((r) => r[0] === unique),
  );
  ledgerFor(page).fail = true;
  await page.evaluate(() => (window.__fixture.mode = 'invalid'));
  await ui(page).getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await expect(ui(page).locator('.status')).toHaveClass(/error/);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 14,
    cachedRows: 14,
  });
  expect(
    (await snapshots(extensionContext)).find((s) => s.rows.some((r) => r[0] === unique)),
  ).toEqual(before);
});
test('account and currency changes never display another account cache', async ({ page }) => {
  const ledger = ledgerFor(page),
    first = ledger.accountId;
  await openWallet(page);
  await search(page);
  ledger.accountId += '-other';
  let release = holdNative(page);
  try {
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().cacheAvailable))
      .toBe(true);
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(0);
  } finally {
    release();
  }
  await waitForStartup(page);
  ledger.accountId = first;
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().rows))
    .toBe(14);
  await waitForStartup(page);
  release = holdNative(page);
  try {
    await page.goto('https://www.etoro.com/wallet/account/GBP');
    await expect
      .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().cacheAvailable))
      .toBe(true);
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
      currency: 'GBP',
      rows: 0,
    });
  } finally {
    release();
  }
  await waitForStartup(page);
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
});
test('clearing the cache removes only local account data and restores the original list', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  await ui(page).getByRole('button', { name: 'Lokalen Cache löschen', exact: true }).click();
  await expect(ui(page).locator('.status')).toHaveText('Lokaler Cache gelöscht.');
  await expect(page.locator('cdk-virtual-scroll-viewport')).toBeVisible();
  await page.reload();
  await waitForStartup(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
  expect(await page.evaluate(() => window.__fixture.financialActions)).toBe(0);
});
test('concurrent tabs update separate old periods without losing the other cached period', async ({
  page,
  extensionContext,
}) => {
  await openWallet(page);
  const second = await extensionContext.newPage();
  ledgerFor(second).accountId = ledgerFor(page).accountId;
  await fixtureDate(second);
  try {
    await openWallet(second);
    await ui(page).getByLabel('Von', { exact: true }).fill('2025-01-01');
    await ui(page).getByLabel('Bis', { exact: true }).fill('2025-12-31');
    await ui(second).getByLabel('Von', { exact: true }).fill('2026-09-01');
    await ui(second).getByLabel('Bis', { exact: true }).fill('2026-09-30');
    await Promise.all([search(page), search(second)]);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().rows))
      .toBeGreaterThanOrEqual(4);
    expect(
      await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().cachedRows),
    ).toBeGreaterThanOrEqual(4);
  } finally {
    await second.close();
  }
});
