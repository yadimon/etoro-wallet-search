import {
  test,
  expect,
  openWallet,
  ui,
  search,
  ledgerFor,
  holdNative,
  waitForStartup,
} from './helpers.mjs';
import { TRANSLATIONS } from '../i18n.mjs';

test('native search has no file import, no visible statistics until expanded, and preserves financial controls', async ({
  page,
}) => {
  await openWallet(page);
  await expect(ui(page).locator('input[type=file]')).toHaveCount(0);
  await expect(ui(page).locator('#wallet-search-statistics')).toBeHidden();
  await expect(
    ui(page)
      .locator('.card')
      .first()
      .locator('details.statistics-accordion > summary.statistics-summary'),
  ).toHaveText('Statistiken');
  await expect(
    ui(page).locator('.heading').getByRole('button', { name: 'Statistiken', exact: true }),
  ).toHaveCount(0);
  const before = await page.evaluate(() => window.__fixture.before);
  await search(page);
  expect({
    rows: await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows),
    requests: ledgerFor(page).requests,
  }).toEqual({
    rows: 14,
    requests: Array.from({ length: 2 }, () => ({
      next: '',
      count: '40',
      method: 'POST',
      body: '{}',
    })),
  });
  expect(await page.locator('et-wallet-account-balance').evaluate((n) => n.outerHTML)).toBe(
    before.balance,
  );
  expect(await page.locator('[data-native-details]').evaluate((n) => n.outerHTML)).toBe(
    before.details,
  );
  await expect(page.locator('cdk-virtual-scroll-viewport')).toBeHidden();
  expect(await page.evaluate(() => window.__fixture.financialActions)).toBe(0);
  expect(ledgerFor(page).requests).toEqual(
    Array.from({ length: 2 }, () => ({ next: '', count: '40', method: 'POST', body: '{}' })),
  );
});
for (const client of ['angular', 'amd'])
  test(`native listing reuses the ${client} site client with its own authentication interceptors`, async ({
    page,
  }) => {
    await openWallet(page, `?client=${client}`);
    await search(page);
    await expect(ui(page)).toHaveAttribute('data-source', 'native');
    await expect(ui(page)).toHaveAttribute('data-native-transport', 'site-http');
    await expect(ui(page)).not.toHaveAttribute('data-native-error');
    expect(await page.evaluate(() => window.__fixture.clientRequests)).toBe(2);
    expect(await page.evaluate(() => window.__fixture.exports)).toEqual([]);
  });
test('cancelling a request through the site client also cancels its transport', async ({
  page,
}) => {
  await openWallet(page, '?client=angular');
  await page.evaluate(() => {
    window.angular.element = () => ({
      injector: () => ({
        get: () => ({
          post: (_url, _data, config) =>
            new Promise((_, reject) =>
              config.timeout.then(() => {
                window.__fixture.clientCancelled = true;
                reject({ status: -1 });
              }),
            ),
        }),
      }),
    });
  });
  await ui(page).getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(ui(page).getByRole('button', { name: 'Abbrechen', exact: true })).toBeVisible();
  await ui(page).getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  expect(await page.evaluate(() => window.__fixture.clientCancelled)).toBe(true);
  expect(await page.evaluate(() => window.__fixture.exports)).toEqual([]);
});
test('text, date, direction, category, status and strict amount filters compose', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page);
  await app.getByRole('searchbox').fill('Coffee');
  await app.getByLabel('Von', { exact: true }).fill('2026-10-22');
  await app.getByLabel('Bis', { exact: true }).fill('2026-10-22');
  await app.getByLabel('Richtung', { exact: true }).selectOption('out');
  await app.getByLabel('Typ', { exact: true }).selectOption('payments');
  await app.getByLabel('Status', { exact: true }).selectOption('settled');
  await app.getByRole('combobox', { name: 'Betrag', exact: true }).selectOption('gt');
  await app.getByRole('textbox', { name: 'Betrag', exact: true }).fill('35');
  await expect(app.locator('.row')).toHaveCount(0);
  await app.getByRole('textbox', { name: 'Betrag', exact: true }).fill('34');
  await expect(app.locator('.row')).toHaveCount(1);
  await expect(app.locator('.row-title')).toHaveText('Coffee Test');
});
test('failed and pending amounts are searchable and do not inflate booked totals', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  await ui(page).getByLabel('Status', { exact: true }).selectOption('failed');
  await expect(ui(page).locator('.row')).toHaveCount(1);
  await expect(ui(page).locator('.row-title')).toHaveText('Cancelled card');
  await expect(ui(page).locator('.summary-line')).toHaveText('Gefunden: 1');
  await ui(page).getByLabel('Status', { exact: true }).selectOption('pending');
  await expect(ui(page).locator('.row')).toHaveCount(2);
  await expect(ui(page).locator('.row-pending')).toHaveCount(2);
});
test('statistics defaults to payments and can add transfers or separate failed attempts', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page);
  await app.locator('.statistics-summary').click();
  await expect(app.locator('#wallet-search-statistics')).toBeVisible();
  await expect(app.locator('.monthly-chart g[data-month]')).toHaveCount(12);
  await expect(app.locator('rect[data-category=transferOut]')).toHaveCount(0);
  await expect(app.locator('rect[data-category=transferIn]')).toHaveCount(0);
  await expect(app.locator('[data-stats-view=payments]')).toHaveAttribute('aria-pressed', 'true');
  await expect(app.locator('rect[data-status=failed]')).toHaveCount(0);
  await app.locator('.status-layers input[value=failed]').check();
  await expect(app.locator('rect[data-status=failed]')).toHaveCount(1);
  await app.locator('[data-stats-view=all]').click();
  await expect(app.locator('rect[data-category=transferOut]')).toHaveCount(1);
  await app.locator('.layers input[value=transferOut]').uncheck();
  await expect(app.locator('rect[data-category=transferOut]')).toHaveCount(0);
  await app.locator('.layers input[value=transferIn]').uncheck();
  await expect(app.locator('rect[data-category=transferIn]')).toHaveCount(0);
  await app.getByRole('searchbox').fill('Coffee');
  await expect(app.locator('.row')).toHaveCount(1);
  const monthCount = await app.locator('.metric-value').last().textContent();
  expect(Number(monthCount)).toBeGreaterThan(1);
  await app.locator('.statistics-summary').click();
  await expect(app.locator('#wallet-search-statistics')).toBeHidden();
});
test('payment and transfer presets produce separate totals and leave transaction search unchanged', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page);
  await app.locator('.statistics-summary').click();
  const payments = await app.locator('.metric-value').first().textContent();
  expect(payments).not.toContain('500');
  await app.locator('[data-stats-view=transfers]').click();
  await expect(app.locator('rect[data-category=payments]')).toHaveCount(0);
  await expect(app.locator('.metric-value').first()).toContainText('500,00');
  await expect(app.locator('.metric-value').nth(1)).toContainText('1.000,00');
  await app.locator('[data-stats-view=payments]').click();
  await expect(app.locator('.metric-value').first()).toHaveText(payments);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().matches)).toBe(14);
});
test('hovering a chart segment immediately highlights it and shows its exact amount without changing filters', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page);
  await app.locator('.statistics-summary').click();
  await expect
    .poll(() => page.evaluate(() => window.__etoroWalletSearchV1.getStatus().busy))
    .toBe(false);
  await app.locator('[data-stats-view=all]').click();
  const requests = ledgerFor(page).requests.length;
  const segment = app.locator(
    'g[data-month="2026-10"] rect[data-category=payments][data-status=settled]',
  );
  await segment.hover();
  await expect(app.locator('.chart-tooltip')).toHaveAttribute('visibility', 'visible');
  await expect(app.locator('.chart-tooltip')).toContainText('Zahlungen');
  await expect(app.locator('.monthly-chart')).toHaveAttribute('data-hover-category', 'payments');
  await expect(segment).toHaveClass(/is-active/);
  await expect(app.locator('g[data-month="2026-01"]')).toHaveClass(/is-dimmed/);
  const amount = Number(await segment.getAttribute('data-minor'));
  await expect(app.locator('.chart-tooltip')).toContainText(
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount / 100),
  );
  await expect(app.getByLabel('Monat', { exact: true })).toHaveCount(0);
  await expect(app.getByLabel('Jahr', { exact: true })).toHaveValue('2026');
  expect(ledgerFor(page).requests.length).toBe(requests);
  await app.locator('.monthly').hover();
  await expect(app.locator('.chart-tooltip')).toHaveAttribute('visibility', 'hidden');
  await expect(segment).not.toHaveClass(/is-active/);
});
test('chart hover information is also available on keyboard focus and can be dismissed', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page);
  await app.locator('.statistics-summary').click();
  // Opening Statistics can replace the chart after an incremental data read.
  // Test the settled keyboard path without pointer events caused by its motion.
  await waitForStartup(page);
  await expect
    .poll(() => app.locator('.statistics-content').evaluate((node) => node.getAnimations().length))
    .toBe(0);
  await page.mouse.move(0, 0);
  const month = app.locator('g[data-month="2026-10"]');
  await month.focus();
  await expect(app.locator('.chart-tooltip')).toHaveAttribute('visibility', 'visible');
  await expect(app.locator('.monthly-chart')).toHaveAttribute('data-hover-month', '2026-10');
  await month.press('Escape');
  await expect(app.locator('.chart-tooltip')).toHaveAttribute('visibility', 'hidden');
});
test('chart keyboard details preserve the selected year, annual totals and search', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page);
  await app.locator('.statistics-summary').click();
  await app.locator('[data-stats-view=all]').click();
  await app.locator('g[data-month="2026-09"]').press('Enter');
  await expect(app.getByLabel('Monat', { exact: true })).toHaveCount(0);
  await expect(app.getByLabel('Jahr', { exact: true })).toHaveValue('2026');
  await expect(app.locator('.metric-value').last()).toHaveText('9');
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().matches)).toBe(14);
});
test('native pagination is bounded and identical legitimate payments keep their distinct IDs', async ({
  page,
}) => {
  const base = ledgerFor(page).rows[0];
  ledgerFor(page).rows = Array.from({ length: 250 }, (_, i) => ({
    ...base,
    transactionId: String(i),
    label: 'Same legitimate payment',
  }));
  await openWallet(page);
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(250);
  expect(ledgerFor(page).requests.map((r) => r.next)).toEqual([
    '',
    '40',
    '80',
    '120',
    '160',
    '200',
    '240',
    '',
  ]);
});
test('50,000 rows use a bounded virtual list and can scroll to the final record', async ({
  page,
}) => {
  const ledger = ledgerFor(page),
    base = ledger.rows[0];
  ledger.bulk = true;
  ledger.rows = Array.from({ length: 50000 }, (_, i) => ({
    ...base,
    transactionId: String(i).padStart(6, '0'),
    label: `Stress ${String(i).padStart(6, '0')}`,
  }));
  await openWallet(page);
  await search(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(50000);
  expect(await ui(page).locator('.row').count()).toBeLessThan(30);
  await ui(page)
    .locator('.view')
    .evaluate((n) => {
      n.scrollTop = n.scrollHeight;
      n.dispatchEvent(new Event('scroll'));
    });
  await expect(ui(page).locator('.row-title').last()).toHaveText('Stress 049999');
});
test('native merchant HTML is displayed as text and never executed', async ({ page }) => {
  ledgerFor(page).rows = [
    {
      ...ledgerFor(page).rows[0],
      label: '<img src="https://outside.invalid/x" onerror="window.executed=true">',
    },
  ];
  await openWallet(page);
  await search(page);
  await expect(ui(page).locator('.row-title')).toHaveText(
    '<img src="https://outside.invalid/x" onerror="window.executed=true">',
  );
  await expect(ui(page).locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.executed)).toBeUndefined();
});
test('removal restores literal native markup without remounting', async ({ page }) => {
  await openWallet(page);
  await search(page);
  await ui(page).getByRole('button', { name: 'Erweiterung ausschalten', exact: true }).click();
  expect(await page.evaluate(() => window.__fixture.snapshot())).toEqual(
    await page.evaluate(() => window.__fixture.before),
  );
  await page.waitForTimeout(1200);
  await expect(ui(page)).toHaveCount(0);
});
test('removing search preserves concurrent changes made by the native site', async ({ page }) => {
  await openWallet(page);
  await search(page);
  await page.locator('cdk-virtual-scroll-viewport').evaluate((node) => {
    window.fixtureNativeReference = node;
    node.style.setProperty('outline', '1px solid blue');
  });
  await ui(page).getByRole('button', { name: 'Erweiterung ausschalten', exact: true }).click();
  expect(
    await page.locator('cdk-virtual-scroll-viewport').evaluate((node) => ({
      same: node === window.fixtureNativeReference,
      display: getComputedStyle(node).display,
      outline: getComputedStyle(node).outlineColor,
    })),
  ).toEqual({ same: true, display: 'block', outline: 'rgb(0, 0, 255)' });
});
test('SPA route changes clear memory and mount a separate currency scope', async ({ page }) => {
  await openWallet(page);
  await search(page);
  await page.evaluate(() => history.pushState({}, '', '/home'));
  await expect(ui(page)).toHaveCount(0);
  const release = holdNative(page);
  try {
    await page.evaluate(async () => {
      history.pushState({}, '', '/wallet/account/GBP');
      await fetch(
        '/api/money/v1/money/fiat/account/fixture-account/currencyBalances/fixture-GBP/transactions/list?itemCount=40&fixtureBootstrap=1',
        { method: 'POST', body: '{}' },
      );
    });
    await expect(ui(page)).toBeVisible();
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().currency)).toBe(
      'GBP',
    );
    expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(0);
  } finally {
    release();
  }
  await waitForStartup(page);
  expect(await page.evaluate(() => window.__etoroWalletSearchV1.getStatus().rows)).toBe(14);
});
for (const [language, dict] of Object.entries(TRANSLATIONS))
  test(`eToro ${language} language, accessible filters and narrow layout`, async ({ page }) => {
    await openWallet(page, `?lang=${language}`);
    await expect(ui(page).getByRole('heading', { name: dict.title, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 400, height: 900 });
    await search(page, dict.search);
    await ui(page).locator('.statistics-summary').click();
    await expect(ui(page)).toHaveAttribute('lang', language);
    await expect(ui(page)).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    expect(
      await ui(page)
        .locator('.card')
        .evaluateAll((cards) => cards.some((c) => c.scrollWidth > c.clientWidth + 1)),
    ).toBe(false);
    await expect(ui(page).getByLabel(dict.type, { exact: true })).toBeVisible();
    await expect(ui(page).getByLabel(dict.status, { exact: true })).toBeVisible();
    await expect(
      ui(page).locator('.heading').getByRole('button', { name: dict.remove, exact: true }),
    ).toBeVisible();
    await expect(
      ui(page).locator('.heading').getByRole('button', { name: dict.refresh, exact: true }),
    ).toBeVisible();
    await expect(ui(page).getByLabel(dict.month, { exact: true })).toHaveCount(0);
    await ui(page).locator('g[data-month="2026-10"] rect[data-category=payments]').hover();
    await expect(ui(page).locator('.chart-tooltip')).toHaveAttribute('visibility', 'visible');
    expect(
      await ui(page)
        .locator('.chart-tooltip')
        .evaluate((node) => {
          const box = node.querySelector('rect').getBoundingClientRect(),
            viewport = node.closest('svg').parentElement.getBoundingClientRect();
          return (
            box.left >= viewport.left - 1 &&
            box.right <= viewport.right + 1 &&
            [...node.querySelectorAll('text')].every((text) => {
              const bounds = text.getBoundingClientRect();
              return bounds.left >= box.left - 1 && bounds.right <= box.right + 1;
            })
          );
        }),
    ).toBe(true);
  });
