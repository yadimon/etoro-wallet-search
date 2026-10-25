import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fixtureRoute, fixtureDate, ledgerFor } from './helpers.mjs';
const userscript = await readFile(
    new URL('../../dist/etoro-wallet-search.user.js', import.meta.url),
    'utf8',
  ),
  ui = (page) => page.locator('[data-etoro-wallet-search]');
test.beforeEach(async ({ page }) => {
  ledgerFor(page);
  await fixtureDate(page);
  await page.addInitScript(() => {
    window.GM_getValue = (key, fallback) => {
      const value = localStorage.getItem(`fixture:${key}`);
      return value === null ? fallback : JSON.parse(value);
    };
    window.GM_setValue = (key, value) =>
      localStorage.setItem(`fixture:${key}`, JSON.stringify(value));
    window.GM_deleteValue = (key) => localStorage.removeItem(`fixture:${key}`);
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/__wallet_fixture__/userscript.js')
      return route.fulfill({ contentType: 'text/javascript', body: userscript });
    if (url.pathname === '/wallet/account/EUR') {
      const { fixtureHTML } = await import('./fixture.mjs');
      return route.fulfill({
        contentType: 'text/html',
        headers: {
          'Content-Security-Policy':
            "script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" +
            (url.searchParams.get('mode')?.startsWith('server-gm') ? "; connect-src 'none'" : ''),
        },
        body: fixtureHTML(url, { accountId: ledgerFor(page).accountId }).replace(
          '</body>',
          '<script src="/__wallet_fixture__/userscript.js"></script></body>',
        ),
      });
    }
    return fixtureRoute(route);
  });
});
test('standalone userscript supports native transactions and persistent GM cache', async ({
  page,
}) => {
  await page.goto('https://www.etoro.com/wallet/account/EUR');
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    rows: 14,
    cachedRows: 14,
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().rows))
    .toBe(14);
});
test('userscript GM request reads a native export if page requests are blocked', async ({
  page,
}) => {
  await page.goto('https://www.etoro.com/wallet/account/EUR?mode=server-gm');
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows))
    .toBe(6);
  expect(await page.evaluate(() => window.__fixture.gmRequests)).toHaveLength(1);
  expect(await page.evaluate(() => window.__fixture.gmRequests[0])).toMatchObject({
    anonymous: true,
    responseType: 'arraybuffer',
    redirect: 'error',
  });
});
