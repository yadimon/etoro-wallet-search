import { test as base, chromium, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { exportTSV, FIXTURE_ROWS, NATIVE_ROWS, fixtureHTML, fixtureScript } from './fixture.mjs';
const extensionPath = fileURLToPath(new URL('../../dist/chrome-extension', import.meta.url)),
  ledgers = new WeakMap();
export function ledgerFor(page) {
  if (!ledgers.has(page))
    ledgers.set(page, {
      accountId: randomUUID(),
      rows: structuredClone(NATIVE_ROWS),
      requests: [],
      bulk: false,
      fail: false,
    });
  return ledgers.get(page);
}
export function holdNative(page) {
  const ledger = ledgerFor(page);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  ledger.gate = gate;
  return () => {
    if (ledger.gate === gate) ledger.gate = null;
    release();
  };
}
export async function fixtureDate(page) {
  // Playwright's full clock intentionally replaces Resource Timing with [];
  // this adapter needs real timing entries to discover the native endpoint.
  await page.addInitScript(() => {
    const OriginalDate = Date,
      epoch = OriginalDate.parse('2026-10-24T12:00:00Z'),
      start = performance.now();
    window.Date = class extends OriginalDate {
      constructor(...args) {
        super(...(args.length ? args : [epoch + performance.now() - start]));
      }
      static now() {
        return Math.floor(epoch + performance.now() - start);
      }
    };
  });
}
export async function fixtureRoute(route) {
  const url = new URL(route.request().url());
  if (url.protocol === 'chrome-extension:') return route.continue();
  if (
    !['https://www.etoro.com', 'https://walletsearchfixture.blob.core.windows.net'].includes(
      url.origin,
    )
  )
    throw new Error(`Unexpected fixture network: ${url.origin}${url.pathname}`);
  if (url.pathname === '/__wallet_fixture__/app.js')
    return route.fulfill({ contentType: 'text/javascript', body: fixtureScript() });
  if (['/__wallet_fixture__/export', '/__wallet_fixture__/export.tsv'].includes(url.pathname)) {
    const from = url.searchParams.get('from'),
      to = url.searchParams.get('to'),
      selected = FIXTURE_ROWS.filter((row) => {
        const [d, m, y] = row[1].slice(0, 10).split('/');
        const day = `${y}-${m}-${d}`;
        return (!from || day >= from) && (!to || day <= to);
      });
    return route.fulfill({
      contentType: 'text/tab-separated-values',
      headers: url.searchParams.has('attachment')
        ? {
            'Content-Disposition':
              'attachment; filename=eToroTransactions_01-01-2007_24-10-2026_fixture.tsv',
          }
        : {},
      body: exportTSV(selected),
    });
  }
  const page = route.request().frame()?.page(),
    ledger = page ? ledgerFor(page) : null;
  if (
    /^\/api\/money\/v1\/money\/fiat\/account\/fixture-account\/currencyBalances\/fixture-(EUR|GBP)\/transactions\/list$/.test(
      url.pathname,
    )
  ) {
    const bootstrap = url.searchParams.has('fixtureBootstrap'),
      mode = new URL(page.url()).searchParams.get('mode') || 'native';
    if (!bootstrap)
      ledger.requests.push({
        next: url.searchParams.get('next') || '',
        count: url.searchParams.get('itemCount'),
        method: route.request().method(),
        body: route.request().postData(),
      });
    if (!bootstrap && ledger.gate) await ledger.gate;
    if (!bootstrap && (mode !== 'native' || ledger.fail))
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    if (
      !bootstrap &&
      new URL(page.url()).searchParams.has('client') &&
      route.request().headers()['x-fixture-site-client'] !== '1'
    )
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    if (
      !bootstrap &&
      (url.searchParams.get('itemCount') !== '40' ||
        !url.searchParams.has('next') ||
        !/^[0-9a-f-]{36}$/.test(url.searchParams.get('client_request_id') || ''))
    )
      return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' });
    const currency = url.pathname.includes('fixture-GBP') ? 826 : 978;
    const rows = ledger.rows
      .map((row) => ({ ...row, currency: row.currency === 978 ? currency : row.currency }))
      .sort(
        (a, b) =>
          Date.parse(b.transactionTime) - Date.parse(a.transactionTime) ||
          String(a.transactionId).localeCompare(String(b.transactionId)),
      );
    const start = Number(url.searchParams.get('next') || 0),
      count = bootstrap
        ? 1
        : ledger.bulk
          ? rows.length
          : Number(url.searchParams.get('itemCount') || 100),
      next = start + count;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        transactions: rows.slice(start, next),
        next: next < rows.length ? String(next) : null,
        hasMoreRecords: next < rows.length,
      }),
    });
  }
  if (
    url.origin === 'https://www.etoro.com' &&
    ['/wallet/account/EUR', '/wallet/account/GBP', '/home', '/settings/'].includes(url.pathname)
  )
    return route.fulfill({
      contentType: 'text/html',
      headers: {
        'Content-Security-Policy':
          "script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" +
          (['server-bridge', 'server-external', 'server-gm', 'server-gm-stall'].includes(
            url.searchParams.get('mode'),
          )
            ? "; connect-src 'none'"
            : ''),
      },
      body: fixtureHTML(url, { accountId: ledger.accountId }),
    });
  return route.abort();
}
export const test = base.extend({
  exportServerPermission: [false, { option: true, scope: 'worker' }],
  extensionContext: [
    async ({ exportServerPermission }, use, workerInfo) => {
      let loadedExtension = extensionPath;
      if (exportServerPermission) {
        loadedExtension = fileURLToPath(
          new URL(
            `../../test-results/extension-fixtures/${workerInfo.workerIndex}/`,
            import.meta.url,
          ),
        );
        await mkdir(loadedExtension, { recursive: true });
        await cp(extensionPath, loadedExtension, { recursive: true });
        const manifestPath = new URL(
            `../../test-results/extension-fixtures/${workerInfo.workerIndex}/manifest.json`,
            import.meta.url,
          ),
          manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        manifest.host_permissions.push('https://walletsearchfixture.blob.core.windows.net/*');
        await writeFile(manifestPath, JSON.stringify(manifest));
      }
      const context = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        headless: true,
        viewport: { width: 1440, height: 1000 },
        timezoneId: workerInfo.project.use.timezoneId,
        locale: 'en-GB',
        acceptDownloads: true,
        args: [
          `--disable-extensions-except=${loadedExtension}`,
          `--load-extension=${loadedExtension}`,
        ],
      });
      const unexpected = [];
      await context.route('**/*', async (route) => {
        try {
          await fixtureRoute(route);
        } catch (error) {
          unexpected.push(error.message);
          await route.abort();
        }
      });
      try {
        await use(context);
        expect(unexpected, 'unrelated network access').toEqual([]);
      } finally {
        await context.close();
      }
    },
    { scope: 'worker' },
  ],
  page: async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();
    ledgerFor(page);
    await fixtureDate(page);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors, 'uncaught page errors').toEqual([]);
    await page.close();
  },
});
export { expect };
export const ui = (page) => page.locator('[data-etoro-wallet-search]');
export async function openWallet(page, query = '') {
  await page.goto(`https://www.etoro.com/wallet/account/EUR${query}`);
  await expect(ui(page)).toBeVisible();
  await waitForStartup(page);
}
export async function waitForStartup(page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const status = window.__etoroWalletSearchV1?.getStatus();
        return !!status?.mounted && !status.initializing && !status.busy;
      }),
    )
    .toBe(true);
}
export async function search(page, label = 'Suchen') {
  await ui(page).getByRole('button', { name: label, exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().loaded))
    .toBe(true);
}
export async function extensionId(context) {
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions/');
    const item = page.locator('extensions-item').filter({ hasText: 'eToro Wallet Search' });
    await expect(item).toHaveCount(1);
    return await item.getAttribute('id');
  } finally {
    await page.close();
  }
}
