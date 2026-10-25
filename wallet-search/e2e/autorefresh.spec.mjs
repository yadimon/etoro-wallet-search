import {
  test,
  expect,
  openWallet,
  waitForStartup,
  ui,
  ledgerFor,
  holdNative,
  search,
} from './helpers.mjs';

async function trimCachedHistory(context, id) {
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  await worker.evaluate(
    (id) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('wallet-search-local-v3', 1);
        request.onerror = () => reject(new Error('open failed'));
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('accounts', 'readwrite'),
            scan = tx.objectStore('accounts').openCursor();
          let found = false;
          scan.onsuccess = () => {
            const cursor = scan.result;
            if (!cursor) return;
            if (!cursor.value.rows.some((row) => row[0] === id)) {
              cursor.continue();
              return;
            }
            const value = cursor.value;
            value.rows = value.rows.filter((row) => row[2] >= Date.parse('2026-01-01T00:00:00Z'));
            value.ranges = [{ from: '2026-01-01', to: '2026-10-24' }];
            cursor.update(value);
            found = true;
          };
          tx.oncomplete = () => {
            db.close();
            found ? resolve() : reject(new Error('missing snapshot'));
          };
          tx.onerror = () => reject(new Error('write failed'));
        };
      }),
    id,
  );
}

test('opening Wallet loads history once without any user interaction', async ({ page }) => {
  await openWallet(page);
  expect(ledgerFor(page).requests).toHaveLength(1);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 14,
    cachedRows: 14,
    initializing: false,
    busy: false,
  });
  await expect(ui(page).locator('.heading .loaded-count')).toContainText('14');
  await expect(ui(page).locator('.results-card .loaded-count')).toHaveCount(0);
  await expect(ui(page).locator('.results-card .refresh-button')).toHaveCount(0);
  await expect(ui(page).locator('.results-card .summary-line')).toHaveText('Gefunden: 14');
});

test('cached rows stay searchable while an automatic refresh spins in the header and shares a user search', async ({
  page,
}) => {
  await openWallet(page);
  const ledger = ledgerFor(page),
    before = ledger.requests.length,
    release = holdNative(page);
  ledger.rows[0].amount = -36;
  try {
    await page.reload();
    await expect.poll(() => ledger.requests.length).toBe(before + 1);
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
      rows: 14,
      busy: true,
      cachedRows: 14,
    });
    const refresh = ui(page).locator('.heading .refresh-button');
    await expect(refresh).toBeDisabled();
    await expect(refresh).toHaveAttribute('aria-busy', 'true');
    expect(
      await refresh.locator('svg').evaluate((node) => getComputedStyle(node).animationName),
    ).toBe('ws-refresh-spin');
    await ui(page).getByRole('searchbox').fill('Coffee');
    await expect(ui(page).locator('.row')).toHaveCount(1);
    await expect(ui(page).locator('.row-title')).toHaveText('Coffee Test');
    await expect(ui(page).locator('.row-amount')).toContainText('35,00');
    await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
    await page.waitForTimeout(150);
    expect(ledger.requests.length).toBe(before + 1);
  } finally {
    release();
  }
  await waitForStartup(page);
  await expect(ui(page).getByRole('searchbox')).toHaveValue('Coffee');
  await expect(ui(page).locator('.row-amount')).toContainText('36,00');
  await expect(ui(page).locator('.refresh-button')).toHaveAttribute('aria-busy', 'false');
  expect(ledger.requests.length).toBe(before + 1);
});

test('automatic reopen fetches one boundary page without rereading settled archive pages', async ({
  page,
}) => {
  const ledger = ledgerFor(page),
    base = ledger.rows[0];
  for (const row of ledger.rows) row.transactionAnnotation = 0;
  ledger.rows.push(
    ...Array.from({ length: 100 }, (_, i) => ({
      ...base,
      transactionId: `archive-${i}`,
      label: `Archive ${i}`,
      transactionTime: '2024-06-01T10:00:00Z',
    })),
  );
  await openWallet(page);
  const before = ledger.requests.length;
  expect(before).toBe(3);
  ledger.rows[0].amount = -36;
  ledger.rows.push({
    ...base,
    transactionId: 'new-today',
    label: 'New today',
    transactionTime: '2026-10-24T11:00:00Z',
    amount: -3,
  });
  await page.reload();
  await waitForStartup(page);
  expect(ledger.requests.slice(before).map((request) => request.next)).toEqual(['']);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(115);
  await ui(page).getByRole('searchbox').fill('Coffee');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-amount')).toContainText('35,00');
  await ui(page).getByRole('searchbox').fill('New today');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-title')).toHaveText('New today');
});

test('automatic reopen settles eligible pending rows but preserves older pending status', async ({
  page,
}) => {
  const ledger = ledgerFor(page),
    old = ledger.rows.find((row) => row.transactionId === '13'),
    recent = ledger.rows.find((row) => row.transactionId === '9');
  old.transactionTime = '2026-09-01T10:00:00Z';
  await openWallet(page);
  old.transactionAnnotation = 0;
  recent.transactionAnnotation = 0;
  await page.reload();
  await waitForStartup(page);
  await ui(page).getByLabel('Status', { exact: true }).selectOption('pending');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-title')).toHaveText('Old pending transfer');
  await ui(page).getByLabel('Status', { exact: true }).selectOption('settled');
  await ui(page).getByRole('searchbox').fill('Pending card');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-title')).toHaveText('Pending card');
});

test('automatic reopen does not fill older gaps in a partial cache', async ({
  page,
  extensionContext,
}) => {
  const ledger = ledgerFor(page),
    id = `partial-${ledger.accountId}`;
  ledger.rows[1].transactionId = id;
  await openWallet(page);
  await trimCachedHistory(extensionContext, id);
  await page.reload();
  await waitForStartup(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(13);
  await ui(page).getByLabel('Von', { exact: true }).fill('2025-01-01');
  await ui(page).getByLabel('Bis', { exact: true }).fill('2025-12-31');
  await expect(ui(page).locator('.summary-line')).toHaveText('Gefunden: 0');
  await search(page);
  await expect(ui(page).locator('.row-title')).toHaveText('Transfer Test');
});

test('failed automatic refresh keeps cache without opening export and manual Refresh recovers with its spinner', async ({
  page,
}) => {
  const ledger = ledgerFor(page);
  for (const row of ledger.rows) row.transactionAnnotation = 0;
  await openWallet(page);
  ledger.rows[0].amount = -42;
  ledger.fail = true;
  await page.reload();
  await waitForStartup(page);
  expect(await page.evaluate(() => window.__fixture.exports)).toEqual([]);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 14,
    cachedRows: 14,
    busy: false,
  });
  await expect(ui(page).locator('.status')).toHaveClass(/error/);
  await ui(page).getByRole('searchbox').fill('Coffee');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-amount')).toContainText('35,00');
  ledger.fail = false;
  const release = holdNative(page);
  try {
    await ui(page)
      .locator('.heading')
      .getByRole('button', { name: 'Aktualisieren', exact: true })
      .click();
    await expect(ui(page).locator('.refresh-button')).toHaveAttribute('aria-busy', 'true');
    await expect(ui(page).locator('.row-amount')).toContainText('35,00');
  } finally {
    release();
  }
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await expect(ui(page).locator('.row-amount')).toContainText('42,00');
  await expect(ui(page).locator('.refresh-button')).toBeEnabled();
});

test('background failure on a fresh visit leaves native history available and export requires a user action', async ({
  page,
}) => {
  await openWallet(page, '?mode=server');
  expect(await page.evaluate(() => window.__fixture.exports)).toEqual([]);
  await expect(page.locator('cdk-virtual-scroll-viewport')).toBeVisible();
  await search(page);
  expect(await page.evaluate(() => window.__fixture.exports)).toHaveLength(1);
});

test('statistics has only a year selector, shows annual totals and retains monthly hover details', async ({
  page,
}) => {
  await openWallet(page);
  const app = ui(page);
  await app.locator('.statistics-summary').click();
  await expect(app.locator('.statistics-body select')).toHaveCount(1);
  await expect(app.getByLabel('Monat', { exact: true })).toHaveCount(0);
  await expect(app.locator('.metric-value').first()).toContainText('80,00');
  await expect(app.locator('.metric-value').last()).toHaveText('4');
  await app.locator('g[data-month="2026-09"]').focus();
  await expect(app.locator('.chart-tooltip')).toHaveAttribute('visibility', 'visible');
  await app.locator('g[data-month="2026-09"]').press('Enter');
  await expect(app.locator('.metric-value').first()).toContainText('80,00');
  await app.locator('[data-stats-view=transfers]').click();
  await app.getByLabel('Jahr', { exact: true }).selectOption('2025');
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await expect(app.locator('.metric-value').nth(1)).toContainText('500,00');
  await expect(app.locator('.metric-value').last()).toHaveText('1');
  await app.getByLabel('Jahr', { exact: true }).selectOption('2026');
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await app.locator('.heading').hover();
  await page.screenshot({
    path: `test-results/wallet-search-0.6.0-${test.info().project.name}.png`,
  });
});

test('reduced motion keeps the refresh loading indicator accessible without rotation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWallet(page);
  const release = holdNative(page);
  try {
    await ui(page).locator('.refresh-button').click();
    await expect(ui(page).locator('.refresh-button')).toHaveAttribute('aria-busy', 'true');
    expect(
      await ui(page)
        .locator('.refresh-icon')
        .evaluate((node) => getComputedStyle(node).animationName),
    ).toBe('none');
  } finally {
    release();
  }
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
});
