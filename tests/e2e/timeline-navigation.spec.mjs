import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/timeline-r23.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
}

test.beforeEach(async ({ page }) => {
  await openFixture(page);
});

test('resolves 120 Ma into a local Cretaceous timeline', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'test' }));

  await expect(page.locator('#timelineHudValue')).toHaveText('120 Ma');
  await expect(page.locator('#timelineHudEra')).toHaveText('Cretaceous');
  await expect(page.locator('#timelineBreadcrumb')).toContainText('Phanerozoic');
  await expect(page.locator('#timelineBreadcrumb')).toContainText('Mesozoic');
  await expect(page.locator('#timelineIntervalRail')).toContainText('Triassic');
  await expect(page.locator('#timelineIntervalRail')).toContainText('Jurassic');
  await expect(page.locator('#timelineIntervalRail')).toContainText('Cretaceous');
  await expect(page.locator('#timelineRangeStart')).toHaveText('145 Ma');
  await expect(page.locator('#timelineRangeEnd')).toHaveText('66 Ma');
});

test('uses the selected period as the scrubber scale', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'test' }));
  const slider = page.locator('#timelinePrimarySlider');

  await slider.evaluate((element) => {
    element.value = '750';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const preview = await page.evaluate(() => WorldlineTimelineState.getState().previewValue);
  expect(preview).toBeGreaterThan(85);
  expect(preview).toBeLessThan(87);

  await slider.evaluate((element) => element.dispatchEvent(new Event('change', { bubbles: true })));
  const committed = await page.evaluate(() => WorldlineTimelineState.getState().earthAgeMa);
  expect(committed).toBeGreaterThan(85);
  expect(committed).toBeLessThan(87);
});

test('restores the committed date when a scrub is canceled', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'test' }));
  const slider = page.locator('#timelinePrimarySlider');

  await slider.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
    element.value = '850';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 7 }));
  });

  await expect(page.locator('#timelineHudValue')).toHaveText('120 Ma');
  const state = await page.evaluate(() => WorldlineTimelineState.getState());
  expect(state.earthAgeMa).toBe(120);
  expect(state.interaction).toBe('idle');
});

test('selecting a neighboring period changes the local scale', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'test' }));
  await page.getByRole('button', { name: 'Jurassic' }).click();

  await expect(page.locator('#timelineHudEra')).toHaveText('Jurassic');
  await expect(page.locator('#timelineRangeStart')).toHaveText('201.4 Ma');
  await expect(page.locator('#timelineRangeEnd')).toHaveText('145 Ma');

  const age = await page.evaluate(() => WorldlineTimelineState.getState().earthAgeMa);
  expect(age).toBeGreaterThan(172);
  expect(age).toBeLessThan(174);
});

test('updates the coastline source while the local timeline is scrubbed', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'test' }));
  await page.locator('#timelinePrimarySlider').evaluate((element) => {
    element.value = '600';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect.poll(() => page.evaluate(() => window.__fixturePreviewFetches.length)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__fixtureSourceUpdates.length)).toBeGreaterThan(0);
  await expect(page.locator('#timelineRenderStatus')).toContainText('Coastlines ready');
});

test('removes the permanent play control and milestone card', async ({ page }) => {
  await expect(page.locator('.timeline-play')).toHaveCount(0);
  await expect(page.locator('.timeline-era-card')).toHaveCount(0);
  await expect(page.locator('#timelineIntervalRail')).toBeVisible();
});

test('keeps the active timeline compact and anchored to the bottom', async ({ page }) => {
  const geometry = await page.locator('#timelineHud').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      height: rect.height,
      bottomGap: window.innerHeight - rect.bottom,
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
      documentScrollX: window.scrollX,
      railScrollLeft: document.querySelector('#timelineIntervalRail').scrollLeft
    };
  });

  expect(geometry.height).toBeLessThan(390);
  expect(geometry.bottomGap).toBeGreaterThanOrEqual(0);
  expect(geometry.bottomGap).toBeLessThan(30);
  expect(geometry.left).toBeGreaterThanOrEqual(7);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth - 7);
  expect(geometry.documentScrollX).toBe(0);
  expect(geometry.railScrollLeft).toBeGreaterThanOrEqual(0);
});

test('settings contains only contextual reconstruction controls on Earth history', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(page.locator('#worldlineSettingsTitle')).toHaveText('Settings');
  await expect(page.locator('#worldlineSettingsSubtitle')).toHaveText('Earth reconstruction');
  await expect(page.locator('#worldlineSettingsBody')).toBeVisible();
  await expect(page.locator('.metric-grid')).toBeHidden();
  await expect(page.locator('.timeline-block')).toBeHidden();
  await expect(page.locator('.quick-years')).toBeHidden();
  await expect(page.locator('.surface-control')).toBeHidden();
  await expect(page.locator('.legend')).toBeHidden();
  await expect(page.locator('.imagery-note')).toBeHidden();
  await expect(page.locator('#settingsHistorySection')).toBeHidden();
});

test('reveals historical layer controls only in Human history', async ({ page }) => {
  await page.getByRole('button', { name: 'Human' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(page.locator('#worldlineSettingsSubtitle')).toHaveText('Human history');
  await expect(page.locator('#settingsHistorySection')).toBeVisible();
  await expect(page.locator('#settingsHistoryGroup')).toContainText('Dated map records');
  await expect(page.locator('#settingsHistoryGroup')).toContainText('Reviewed sites');
});
