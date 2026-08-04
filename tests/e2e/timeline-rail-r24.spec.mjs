import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/timeline-r23.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
  await page.addStyleTag({ url: 'http://127.0.0.1:4173/timeline-rail-r24.css' });
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/timeline-rail-r24.js' });
  await page.waitForFunction(() => window.__WORLDLINE_TIMELINE_RAIL_BUILD__ === '2026-08-04-globe-r24');
}

test.beforeEach(async ({ page }) => {
  await openFixture(page);
});

test('keeps every geological interval in one persistent chronological rail', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'r24-test' }));

  const labels = await page.locator('#timelineIntervalRail [data-interval-id]').allTextContents();
  expect(labels).toHaveLength(17);
  expect(labels[0]).toBe('Hadean');
  expect(labels).toContain('Paleoproterozoic');
  expect(labels).toContain('Cambrian');
  expect(labels).toContain('Cretaceous');
  expect(labels.at(-1)).toBe('Quaternary');
  await expect(page.locator('[data-interval-id="cretaceous"]')).toHaveAttribute('aria-pressed', 'true');
});

test('does not replace the rail or lose bubbles when moving into early Earth', async ({ page }) => {
  await page.evaluate(() => {
    window.__r24RailReference = document.querySelector('#timelineIntervalRail');
    WorldlineTimelineState.setEarthAge(3500, { source: 'r24-test' });
  });

  await expect(page.locator('[data-interval-id="archean"]')).toHaveAttribute('aria-pressed', 'true');
  const result = await page.evaluate(() => ({
    sameNode: document.querySelector('#timelineIntervalRail') === window.__r24RailReference,
    count: document.querySelectorAll('#timelineIntervalRail [data-interval-id]').length,
    hasHadean: Boolean(document.querySelector('[data-interval-id="hadean"]')),
    hasQuaternary: Boolean(document.querySelector('[data-interval-id="quaternary"]'))
  }));

  expect(result.sameNode).toBe(true);
  expect(result.count).toBe(17);
  expect(result.hasHadean).toBe(true);
  expect(result.hasQuaternary).toBe(true);
});

test('preserves manual horizontal position while the year scrubber previews', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'r24-test' }));
  const rail = page.locator('#timelineIntervalRail');
  const maximum = await rail.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(maximum).toBeGreaterThan(100);

  const target = Math.min(320, maximum - 20);
  await rail.evaluate((element, left) => {
    element.scrollLeft = left;
    element.dispatchEvent(new Event('scroll'));
  }, target);

  await page.locator('#timelinePrimarySlider').evaluate((element) => {
    element.value = '620';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.waitForTimeout(150);
  const after = await rail.evaluate((element) => element.scrollLeft);
  expect(Math.abs(after - target)).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-interval-id="cretaceous"]')).toHaveAttribute('aria-pressed', 'true');
});

test('selecting Hadean keeps the complete rail and smoothly centers the active bubble', async ({ page }) => {
  await page.evaluate(() => {
    WorldlineTimelineState.setEarthAge(120, { source: 'r24-test' });
    const rail = document.querySelector('#timelineIntervalRail');
    window.__r24ScrollCalls = [];
    const nativeScrollTo = rail.scrollTo.bind(rail);
    rail.scrollTo = (options) => {
      window.__r24ScrollCalls.push(options);
      nativeScrollTo(options);
    };
  });

  await page.locator('[data-interval-id="hadean"]').click();
  await expect(page.locator('[data-interval-id="hadean"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#timelineIntervalRail [data-interval-id]')).toHaveCount(17);
  await expect(page.locator('[data-interval-id="quaternary"]')).toHaveCount(1);

  await expect.poll(() => page.evaluate(() => window.__r24ScrollCalls.length)).toBeGreaterThan(0);
  const lastCall = await page.evaluate(() => window.__r24ScrollCalls.at(-1));
  expect(lastCall.behavior).toBe('smooth');
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
});

test('supports keyboard travel through the complete interval sequence', async ({ page }) => {
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(120, { source: 'r24-test' }));
  const cretaceous = page.locator('[data-interval-id="cretaceous"]');
  await cretaceous.focus();
  await cretaceous.press('ArrowRight');

  await expect(page.locator('[data-interval-id="paleogene"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#timelineHudEra')).toHaveText('Paleogene');
  await expect(page.locator('#timelineIntervalRail [data-interval-id]')).toHaveCount(17);
});