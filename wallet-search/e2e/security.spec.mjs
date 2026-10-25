import { test, expect, openWallet, search, ui, ledgerFor } from './helpers.mjs';

test('CSV fallback never fills or submits an unrelated form with two date fields', async ({
  page,
}) => {
  await openWallet(page, '?mode=foreign-form');
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.locator('form#fixture-export')).toBeVisible();
  // Give the discovery poll time to run; it must leave this form alone.
  await page.waitForTimeout(250);
  expect(await page.locator('form#fixture-export input').first().inputValue()).toBe('');
  expect(await page.evaluate(() => window.__fixture.financialActions)).toBe(0);
  expect(await page.evaluate(() => window.__fixture.exports)).toEqual([]);
  await ui(page).getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  expect(await page.evaluate(() => window.__fixture.hooksRestored())).toBe(true);
});

test('cancelling an unresponsive site client releases the UI even when it ignores timeout', async ({
  page,
}) => {
  await openWallet(page, '?client=angular');
  await page.evaluate(() => {
    window.angular.element = () => ({
      injector: () => ({ get: () => ({ post: () => new Promise(() => {}) }) }),
    });
  });
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(ui(page).getByRole('button', { name: 'Abbrechen', exact: true })).toBeVisible();
  await ui(page).getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  expect(await page.evaluate(() => window.__fixture.exports)).toEqual([]);
});

test('overflow in pending chart layers cannot replace the last good dataset or cache', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const ledger = ledgerFor(page);
  ledger.rows.push({
    ...ledger.rows[0],
    transactionId: 'overflow-pending',
    amount: '-90071992547409.91',
    transactionAnnotation: 1,
  });
  await ui(page).getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await expect(ui(page).locator('.status')).toHaveClass(/error/);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1?.getStatus().rows))
    .toBe(14);
});
