import { test, expect, openWallet, ui, search } from './helpers.mjs';
test.use({ exportServerPermission: true });
for (const mode of [
  'server',
  'server-inline',
  'data',
  'cached-blob',
  'dispatched-blob',
  'fetch',
  'xhr',
  'server-bridge',
  'server-external',
])
  test(`CSV fallback ${mode} stays automatic without exposing file-import UI`, async ({ page }) => {
    const downloads = [];
    page.on('download', (download) => downloads.push(download));
    await openWallet(page, `?mode=${mode}`);
    await search(page);
    expect(page.url()).toBe(`https://www.etoro.com/wallet/account/EUR?mode=${mode}`);
    expect(downloads).toHaveLength(0);
    await expect(ui(page)).toHaveAttribute(
      'data-native-error',
      ['server-bridge', 'server-external'].includes(mode)
        ? 'NATIVE_NOT_OBSERVED'
        : 'NATIVE_HTTP_503',
    );
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(6);
    await expect(ui(page).locator('input[type=file]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__fixture.hooksRestored())).toBe(true);
    await ui(page).getByRole('searchbox').fill('Coffee');
    await expect(ui(page).locator('.row-title')).toHaveCount(1);
    await expect(ui(page).locator('.row-title')).toHaveText('Coffee Test');
    await expect(ui(page).locator('.summary-line')).toHaveText('Gefunden: 1');
  });
test('export capture leaves unrelated anchor clicks intact and restores hooks on cancellation', async ({
  page,
}) => {
  await openWallet(page, '?mode=stall');
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__fixture.exports.length)).toBe(1);
  expect(
    await page.evaluate(() => {
      let clicked = 0;
      const link = document.createElement('a');
      link.href = '/home';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        clicked++;
      });
      link.click();
      link.dispatchEvent(new MouseEvent('click', { cancelable: true }));
      return clicked;
    }),
  ).toBe(2);
  await ui(page).getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  expect(await page.evaluate(() => window.__fixture.hooksRestored())).toBe(true);
  expect(new URL(page.url()).pathname).toBe('/wallet/account/EUR');
});
test('missing TSV types are disclosed instead of appearing as zero card spending', async ({
  page,
}) => {
  await openWallet(page, '?mode=server');
  await search(page);
  await ui(page).locator('.statistics-summary').click();
  await expect(ui(page).locator('.chart-placeholder')).toContainText('Zahlungen und Überweisungen');
  await expect(ui(page).locator('.metric-value').first()).toHaveText('—');
  await ui(page).locator('[data-stats-view=all]').click();
  await ui(page).locator('.status-layers input[value=unknown]').check();
  await expect(ui(page).locator('rect[data-status=unknown]')).not.toHaveCount(0);
  await expect(ui(page).locator('rect[data-category=payments]')).toHaveCount(0);
});
