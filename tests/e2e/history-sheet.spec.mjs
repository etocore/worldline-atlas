import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/history-sheet.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
}

test.beforeEach(async ({ page }) => openFixture(page));

test('opens researched history as a compact title instead of an automatic medium sheet', async ({ page }) => {
  const sheet = page.locator('#placeSheet');
  const toggle = page.locator('.history-sheet-toggle');

  await expect(sheet).toHaveAttribute('data-content-type', 'history');
  await expect(sheet).toHaveAttribute('data-detent', 'peek');
  await expect(sheet).toHaveAttribute('data-history-expanded', 'false');
  await expect(toggle).toHaveAttribute('role', 'button');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#placeTitle')).toHaveText('Life moves from sea to land');
  await expect(page.locator('#historyBriefing')).toBeHidden();

  const geometry = await page.evaluate(() => {
    const sheet = document.querySelector('#placeSheet').getBoundingClientRect();
    const globe = getComputedStyle(document.querySelector('.fixture-globe'));
    const sheetStyle = getComputedStyle(document.querySelector('#placeSheet'));
    return { height: sheet.height, sheetZ: Number(sheetStyle.zIndex), globeZ: Number(globe.zIndex) };
  });

  expect(geometry.height).toBeGreaterThanOrEqual(74);
  expect(geometry.height).toBeLessThanOrEqual(80);
  expect(geometry.sheetZ).toBeGreaterThan(geometry.globeZ);
});

test('expands only after deliberate disclosure and collapses back to the title', async ({ page }) => {
  const sheet = page.locator('#placeSheet');
  const toggle = page.locator('.history-sheet-toggle');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(sheet).toHaveAttribute('data-detent', 'medium');
  await expect(sheet).toHaveAttribute('data-history-expanded', 'true');
  await expect(page.locator('#historyBriefing')).toBeVisible();
  expect(await sheet.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(220);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(sheet).toHaveAttribute('data-detent', 'peek');
  await expect(sheet).toHaveAttribute('data-history-expanded', 'false');
  await expect(page.locator('#historyBriefing')).toBeHidden();
});

test('resets cleanly between ordinary place details and new history chapters', async ({ page }) => {
  const sheet = page.locator('#placeSheet');
  const headerCopy = page.locator('.place-header > div:first-child');

  await page.evaluate(() => window.openPlaceCard({ name: 'Rome', eyebrow: 'Historical place' }));

  await expect(page.locator('#placeTitle')).toHaveText('Rome');
  await expect(sheet).toHaveAttribute('data-content-type', 'place');
  await expect(sheet).not.toHaveAttribute('data-history-expanded');
  await expect(headerCopy).not.toHaveAttribute('role');
  await expect(page.locator('#historyBriefing')).toBeVisible();

  await page.evaluate(() => window.__fixtureOpenHistory('Cities and writing', 'Human History'));
  await expect(page.locator('#placeTitle')).toHaveText('Cities and writing');
  await expect(page.locator('#placeEyebrow')).toHaveText('Human History');
  await expect(sheet).toHaveAttribute('data-content-type', 'history');
  await expect(sheet).toHaveAttribute('data-detent', 'peek');
  await expect(sheet).toHaveAttribute('data-history-expanded', 'false');
  await expect(headerCopy).toHaveAttribute('aria-expanded', 'false');
});
