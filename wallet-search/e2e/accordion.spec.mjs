import { test, expect, openWallet, ui, search } from './helpers.mjs';

async function sampleAnimation(content, time) {
  return content.evaluate((node, time) => {
    const animation = node.getAnimations()[0];
    if (!animation) throw new Error('Missing accordion animation');
    animation.pause();
    animation.currentTime = time;
    return {
      duration: animation.effect.getTiming().duration,
      height: node.getBoundingClientRect().height,
      fullHeight: node.firstElementChild.getBoundingClientRect().height,
      opacity: Number(getComputedStyle(node).opacity),
    };
  }, time);
}
async function finishAnimation(content) {
  await content.evaluate((node) => {
    for (const animation of node.getAnimations()) animation.finish();
  });
}

test('accordion opens and closes over 300 ms without a final height jump', async ({ page }) => {
  await openWallet(page);
  await search(page);
  const app = ui(page),
    summary = app.locator('.statistics-summary'),
    details = app.locator('.statistics-accordion'),
    content = app.locator('.statistics-content'),
    card = app.locator('.card').first();
  const collapsed = await card.evaluate((node) => node.getBoundingClientRect().height);
  await summary.click();
  const opening = await sampleAnimation(content, 150);
  expect(opening.duration).toBe(300);
  expect(opening.height).toBeGreaterThan(0);
  expect(opening.height).toBeLessThan(opening.fullHeight);
  expect(opening.opacity).toBeGreaterThan(0);
  expect(opening.opacity).toBeLessThan(1);
  await finishAnimation(content);
  await expect.poll(() => content.evaluate((node) => node.getAnimations().length)).toBe(0);
  expect(
    await content.evaluate((node) =>
      Math.abs(
        node.getBoundingClientRect().height - node.firstElementChild.getBoundingClientRect().height,
      ),
    ),
  ).toBeLessThan(1);
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(details).toHaveAttribute('open', '');
  expect(await content.evaluate((node) => node.inert)).toBe(true);
  const closing = await sampleAnimation(content, 150);
  expect(closing.duration).toBe(300);
  expect(closing.height).toBeGreaterThan(0);
  expect(closing.height).toBeLessThan(closing.fullHeight);
  await finishAnimation(content);
  await expect(details).not.toHaveAttribute('open');
  await expect(app.locator('#wallet-search-statistics')).toBeHidden();
  expect(await card.evaluate((node) => node.getBoundingClientRect().height)).toBeCloseTo(
    collapsed,
    0,
  );
});

test('rapid clicks reverse the current motion and removal cancels the animation cleanly', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page),
    summary = app.locator('.statistics-summary'),
    content = app.locator('.statistics-content');
  await summary.click();
  const first = await sampleAnimation(content, 90);
  await summary.click();
  const reversed = await sampleAnimation(content, 0);
  expect(reversed.height).toBeCloseTo(first.height, 0);
  await sampleAnimation(content, 90);
  const before = await content.evaluate((node) => node.getBoundingClientRect().height);
  await summary.click();
  const reopened = await sampleAnimation(content, 0);
  expect(reopened.height).toBeCloseTo(before, 0);
  await finishAnimation(content);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => content.evaluate((node) => node.getAnimations().length)).toBe(0);
  await summary.click();
  await app.getByRole('button', { name: 'Erweiterung ausschalten', exact: true }).click();
  await expect(app).toHaveCount(0);
  await expect(page.locator('cdk-virtual-scroll-viewport')).toBeVisible();
});

test('content arriving during expansion is included before the animation settles', async ({
  page,
}) => {
  await openWallet(page);
  await search(page);
  const app = ui(page),
    content = app.locator('.statistics-content');
  await app.locator('.statistics-summary').click();
  const first = await sampleAnimation(content, 90);
  await app.locator('#wallet-search-statistics').evaluate((node) => {
    const late = document.createElement('div');
    late.style.height = '140px';
    late.textContent = 'Synthetic late content';
    node.append(late);
  });
  await expect
    .poll(() =>
      content.evaluate((node) =>
        Number.parseFloat(node.getAnimations()[0]?.effect.getKeyframes().at(-1).height || '0'),
      ),
    )
    .toBeGreaterThan(first.fullHeight);
  await content.evaluate((node) => {
    const animation = node.getAnimations()[0];
    animation.pause();
    animation.currentTime = Number(animation.effect.getTiming().duration) - 1;
  });
  expect(
    await content.evaluate((node) =>
      Math.abs(
        node.getBoundingClientRect().height - node.firstElementChild.getBoundingClientRect().height,
      ),
    ),
  ).toBeLessThan(1);
  await finishAnimation(content);
  await expect.poll(() => content.evaluate((node) => node.getAnimations().length)).toBe(0);
  expect(
    await content.evaluate((node) =>
      Math.abs(
        node.getBoundingClientRect().height - node.firstElementChild.getBoundingClientRect().height,
      ),
    ),
  ).toBeLessThan(1);
});

test('reduced motion keeps keyboard expansion and collapse immediate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWallet(page);
  await search(page);
  const app = ui(page),
    summary = app.locator('.statistics-summary'),
    details = app.locator('.statistics-accordion'),
    content = app.locator('.statistics-content');
  await summary.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  expect(await content.evaluate((node) => node.getAnimations().length)).toBe(0);
  expect(
    await summary.evaluate((node) => getComputedStyle(node, '::after').transitionDuration),
  ).toBe('0s');
  await summary.press('Space');
  await expect(details).not.toHaveAttribute('open');
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  expect(await content.evaluate((node) => node.getAnimations().length)).toBe(0);
});
