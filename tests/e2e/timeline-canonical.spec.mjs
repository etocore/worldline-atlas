import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/timeline-canonical.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
}

test.beforeEach(async ({ page }) => openFixture(page));

test('ships one canonical timeline runtime', async ({ page }) => {
  await expect.poll(() => page.evaluate(() => window.__WORLDLINE_TIMELINE_BUILD__)).toBe('2026-08-04-globe-r28');
  await expect.poll(() => page.evaluate(() => WorldlineTimelineModel.BUILD)).toBe('2026-08-04-globe-r28');
  await expect.poll(() => page.evaluate(() => WorldlineTimelineState.BUILD)).toBe('2026-08-04-globe-r28');
  await expect(page.locator('#timelineHud')).toHaveAttribute('class', /canonical-timeline/);
});

test('renders full dates directly with leading hierarchy and close-button clearance', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(830.3, { source: 'test' }));
  await page.locator('#yearButton').click();
  await expect(page.locator('#timelineHudValue')).toHaveText('830.3 million years ago');
  await expect(page.locator('#timelineBreadcrumb')).toContainText('Proterozoic');
  await expect(page.locator('#timelineBreadcrumb')).toContainText('Neoproterozoic');

  const geometry = await page.evaluate(() => {
    const hud = document.querySelector('#timelineHud').getBoundingClientRect();
    const crumb = document.querySelector('#timelineBreadcrumb').getBoundingClientRect();
    const value = document.querySelector('#timelineHudValue').getBoundingClientRect();
    const close = document.querySelector('#timelineHudClose').getBoundingClientRect();
    return { hudLeft: hud.left, crumbLeft: crumb.left, valueLeft: value.left, valueRight: value.right, closeLeft: close.left };
  });
  expect(geometry.crumbLeft - geometry.hudLeft).toBeGreaterThanOrEqual(10);
  expect(Math.abs(geometry.valueLeft - geometry.crumbLeft)).toBeLessThanOrEqual(2);
  expect(geometry.valueRight).toBeLessThanOrEqual(geometry.closeLeft - 6);
});

test('keeps all geological bubbles present while the selected interval changes', async ({ page }) => {
  await page.locator('#yearButton').click();
  const rail = page.locator('#timelineIntervalRail');
  await expect(rail.locator('[data-interval-id]')).toHaveCount(17);
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(4300, { source: 'test' }));
  await expect(rail.locator('[data-interval-id]')).toHaveCount(17);
  await expect(rail.getByRole('button', { name: /Quaternary/ })).toHaveCount(1);
  await expect(rail.getByRole('button', { name: /Hadean/ })).toHaveAttribute('aria-pressed', 'true');
});

test('uses the selected geological interval as the local scale', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'test' }));
  await page.locator('#yearButton').click();
  await expect(page.locator('#timelineRangeStart')).toHaveText('145 million years ago');
  await expect(page.locator('#timelineRangeEnd')).toHaveText('66 million years ago');
  await expect(page.locator('#timelinePrimarySlider')).toHaveValue('316');
});

test('keeps Human History chronological from left to right', async ({ page }) => {
  await page.locator('#yearButton').click();
  await page.getByRole('button', { name: 'Human', exact: true }).click();
  await page.evaluate(() => WorldlineTimelineState.setHumanYear(1824, { source: 'test' }));
  const slider = page.locator('#timelinePrimarySlider');
  const earlier = await slider.evaluate((element) => ({ value: Number(element.value), direction: getComputedStyle(element).direction }));
  expect(earlier.direction).toBe('ltr');
  expect(earlier.value).toBe(106);

  await page.evaluate(() => WorldlineTimelineState.setHumanYear(1995, { source: 'test' }));
  const later = Number(await slider.inputValue());
  expect(later).toBe(863);
  expect(later).toBeGreaterThan(earlier.value);
  await expect(page.locator('#timelineRangeStart')).toHaveText('1,800 CE');
  await expect(page.locator('#timelineRangeEnd')).toHaveText('Present day');
});

test('keeps the launcher compact while exposing the full accessible date', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(538.8, { source: 'test' }));
  const launcher = page.locator('#yearButton');
  await expect(launcher.locator('#eraLabel')).toHaveText('Earth history');
  await expect(launcher.locator('#yearLabel')).toHaveText('538.8 Ma');
  await expect(launcher).toHaveAttribute('aria-label', /538\.8 million years ago/);
  const geometry = await launcher.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(geometry.width).toBeLessThanOrEqual(217);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeLessThanOrEqual(58);
});

test('shows only contextual settings controls', async ({ page }) => {
  await page.locator('#yearButton').click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('#worldlineSettingsTitle')).toHaveText('Settings');
  await expect(page.locator('#worldlineSettingsBody')).toBeVisible();
  await expect(page.locator('.metric-grid')).toBeHidden();
  await expect(page.locator('.timeline-block')).toBeHidden();
  await expect(page.locator('.quick-years')).toBeHidden();
  await expect(page.locator('.surface-control')).toBeHidden();
});
