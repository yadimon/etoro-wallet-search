// Test only authored static pages using local request fulfilment, never a real Wallet.
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const pages = ['index.html', 'privacy.html', 'support.html', 'legal.html'];
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const errors = [],
  missing = [];
await mkdir(new URL('test-results/site/', root), { recursive: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://project.invalid') {
      errors.push(`Unexpected external request: ${url.origin}`);
      return route.abort();
    }
    const name = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
    if (!/^[a-zA-Z0-9._/-]+$/.test(name) || name.includes('..')) return route.abort();
    try {
      return route.fulfill({
        contentType: name.endsWith('.css')
          ? 'text/css'
          : name.endsWith('.png')
            ? 'image/png'
            : 'text/html',
        body: await readFile(new URL(`docs/${name}`, root)),
      });
    } catch {
      missing.push(name);
      return route.fulfill({ status: 404, body: 'Not found' });
    }
  });
  const results = [];
  for (const width of [1440, 375, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of pages) {
      await page.goto(`https://project.invalid/${name}`);
      await page.locator('img').evaluateAll((images) =>
        Promise.all(
          images.map((image) => {
            image.loading = 'eager';
            return image.decode();
          }),
        ),
      );
      const result = await page.evaluate(() => ({
        title: document.title,
        heading: document.querySelector('h1')?.textContent,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        scriptCount: document.scripts.length,
        brokenImages: [...document.images].filter(
          (image) => !image.complete || image.naturalWidth === 0,
        ).length,
        localLinks: [...document.querySelectorAll('a[href]')]
          .map((node) => node.getAttribute('href'))
          .filter((href) => !href.startsWith('http') && !href.startsWith('mailto:')),
      }));
      if (result.overflow || result.scriptCount || result.brokenImages || !result.heading)
        throw new Error(`Layout failure ${width}/${name}: ${JSON.stringify(result)}`);
      for (const href of result.localLinks) {
        const url = new URL(href, `https://project.invalid/${name}`);
        const target = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
        await readFile(new URL(`docs${target}`, root));
      }
      results.push({ width, page: name, heading: result.heading, horizontalOverflow: false });
      if (name === 'index.html') {
        const faq = page.locator('.faq details').first();
        await faq.locator('summary').click();
        await expect(faq.locator('p')).toBeVisible();
        await faq.locator('summary').press('Enter');
        await expect(faq.locator('p')).toBeHidden();
        await page.getByRole('link', { name: 'Features', exact: true }).click();
        await expect(page).toHaveURL(/#features$/);
        await page.getByRole('link', { name: 'Install', exact: true }).click();
        await expect(page).toHaveURL(/#install$/);
        const navigationTargets = await page
          .locator('.navlinks a')
          .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
        if (navigationTargets.some((height) => height < 44))
          throw new Error(`Small navigation targets at ${width}`);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({
          path: fileURLToPath(new URL(`test-results/site/home-${width}.png`, root)),
          fullPage: false,
        });
      }
    }
  }
  if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }));
  console.log(
    JSON.stringify(
      {
        verified: results,
        unexpectedNetworkRequests: errors.length,
        missingAssets: missing.length,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
