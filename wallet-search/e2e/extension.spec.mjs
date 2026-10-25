import { test, expect, openWallet, ui, search, extensionId } from './helpers.mjs';
import { TRANSLATIONS } from '../i18n.mjs';
test('real popup can show, remove and re-enable the panel while keeping the persistent cache', async ({
  page,
  extensionContext,
}) => {
  await openWallet(page);
  await search(page);
  const id = await extensionId(extensionContext),
    popup = await extensionContext.newPage();
  try {
    await page.bringToFront();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(popup.locator('#status')).toHaveText('Aktiv');
    await expect(popup.locator('#rows')).toHaveText('14');
    await expect(popup.locator('#cache')).toHaveText('14');
    await popup.getByRole('button', { name: 'Panel anzeigen', exact: true }).click();
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
    await popup.getByRole('button', { name: 'Erweiterung ausschalten', exact: true }).click();
    await expect(ui(page)).toHaveCount(0);
    await popup.getByRole('button', { name: 'Suche aktivieren', exact: true }).click();
    await expect(ui(page)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows))
      .toBe(14);
  } finally {
    await popup.close();
  }
});
test('offline help follows every supported site language including RTL', async ({
  page,
  extensionContext,
}) => {
  await openWallet(page);
  const id = await extensionId(extensionContext),
    help = await extensionContext.newPage();
  try {
    for (const [lang, dict] of Object.entries(TRANSLATIONS)) {
      await help.goto(`chrome-extension://${id}/help.html?lang=${lang}`);
      await expect(help.getByRole('heading', { name: dict.help, exact: true })).toBeVisible();
      await expect(help.locator('html')).toHaveAttribute('lang', lang);
      await expect(help.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
  } finally {
    await help.close();
  }
});
test('an unfamiliar export host still requires specific consent and does not hang', async ({
  page,
  extensionContext,
}) => {
  await openWallet(page, '?mode=server-external');
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(ui(page).locator('.status')).toHaveText(TRANSLATIONS.de.permission);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus())).toMatchObject({
    busy: false,
    rows: 0,
    permissionOrigin: 'https://walletsearchfixture.blob.core.windows.net',
  });
  const id = await extensionId(extensionContext),
    popup = await extensionContext.newPage();
  try {
    await page.bringToFront();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(popup.locator('#permission-origin')).toHaveText(
      'https://walletsearchfixture.blob.core.windows.net',
    );
    await expect(
      popup.getByRole('button', { name: 'Dateiserver freigeben', exact: true }),
    ).toBeVisible();
    expect(
      await popup.evaluate(() =>
        chrome.permissions.contains({
          origins: ['https://walletsearchfixture.blob.core.windows.net/*'],
        }),
      ),
    ).toBe(false);
    expect(await page.evaluate(() => window.__fixture.hooksRestored())).toBe(true);
  } finally {
    await popup.close();
  }
});
