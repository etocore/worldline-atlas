import { test, expect } from '@playwright/test';

const fixturePath = '/tests/fixtures/ios-interface.html';

async function openFixture(page) {
  await page.goto(fixturePath);
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true');
}

async function openPlace(page) {
  await page.evaluate(() => {
    window.openPlaceCard({
      name: 'Rome',
      eyebrow: 'Historical city',
      subtitle: '117 CE',
      range: '117 CE',
      confidence: 'Reviewed evidence',
      evidence: 'Fixture record',
      note: 'Regression fixture',
      sourceUrl: '#source',
      coordinates: [12.4964, 41.9028]
    });
  });
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'peek');
}

async function dragVertically(page, selector, deltaY) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Cannot drag hidden element: ${selector}`);
  const x = box.x + box.width / 2;
  const startY = box.y + Math.min(box.height / 2, 18);
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

function durationSeconds(value) {
  return Math.max(...value.split(',').map((entry) => {
    const token = entry.trim();
    if (token.endsWith('ms')) return Number.parseFloat(token) / 1000;
    return Number.parseFloat(token) || 0;
  }));
}

test.beforeEach(async ({ page }) => {
  await openFixture(page);
});

test('keeps exactly one primary surface active', async ({ page }) => {
  await page.locator('#yearButton').click();
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'timeline');
  await expect(page.locator('#timelineHud')).toHaveAttribute('data-open', 'true');

  await page.locator('#brandButton').click();
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'settings');
  await expect(page.locator('#searchShell')).toHaveClass(/is-open/);
  await expect(page.locator('#timelineHud')).toHaveAttribute('data-open', 'false');
  await expect(page.locator('#searchSuggestions')).toHaveAttribute('data-open', 'false');
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'closed');

  await openPlace(page);
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'place');
  await expect(page.locator('#searchShell')).not.toHaveClass(/is-open/);
});

test('uses the established settings handle drag path', async ({ page }) => {
  await expect(page.locator('#searchShell')).not.toHaveClass(/is-open/);
  await dragVertically(page, '#sheetHandle', -70);
  await expect(page.locator('#searchShell')).toHaveClass(/is-open/);
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'settings');

  await dragVertically(page, '#sheetHandle', 70);
  await expect(page.locator('#searchShell')).not.toHaveClass(/is-open/);
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'none');
});

test('moves the real place sheet through peek, medium, and full detents', async ({ page }) => {
  await openPlace(page);

  await dragVertically(page, '#placeSheetHandle', -90);
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'medium');
  await expect.poll(() => page.evaluate(() => window.WorldlineIOSInterface.semanticDetent('place'))).toBe('medium');

  await dragVertically(page, '#placeSheetHandle', -90);
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'full');
  await expect.poll(() => page.evaluate(() => window.WorldlineIOSInterface.semanticDetent('place'))).toBe('large');

  await dragVertically(page, '#placeSheetHandle', 90);
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'medium');
});

test('provides a keyboard alternative for the place-sheet grabber', async ({ page }) => {
  await openPlace(page);
  await page.locator('#placeSheetHandle').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'medium');
  await expect(page.locator('#placeSheetHandle')).toHaveAttribute('aria-expanded', 'true');
});

test('does not treat place content scrolling as a sheet drag', async ({ page }) => {
  await openPlace(page);
  await page.locator('#placeExpand').click();
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'medium');

  await page.locator('.place-sheet-scroll').evaluate((element) => { element.scrollTop = 180; });
  const content = page.locator('.place-sheet-scroll');
  const box = await content.boundingBox();
  if (!box) throw new Error('Place scroll container is hidden');
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 160);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 90, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'medium');
});

test('restores explicit dismissal focus without reopening search', async ({ page }) => {
  await page.locator('#yearButton').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'none');
  await expect(page.locator('#yearButton')).toBeFocused();

  await page.locator('#historySearch').focus();
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'search');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-ui-surface', 'none');
  await expect(page.locator('#historySearch')).not.toBeFocused();
  await expect(page.locator('#searchSuggestions')).toHaveAttribute('data-open', 'false');
});

test('blocks map controls only for a large primary surface', async ({ page }) => {
  await openPlace(page);
  await expect(page.locator('body')).toHaveAttribute('data-ui-blocking', 'false');
  await expect.poll(() => page.locator('.map-tool-stack').evaluate((element) => getComputedStyle(element).pointerEvents)).not.toBe('none');

  await page.locator('#placeExpand').click();
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'medium');
  await expect(page.locator('body')).toHaveAttribute('data-ui-blocking', 'false');

  await page.locator('#placeExpand').click();
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'full');
  await expect(page.locator('body')).toHaveAttribute('data-ui-blocking', 'true');
  await expect.poll(() => page.locator('.map-tool-stack').evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
});

test('maintains scoped 44px activation regions', async ({ page }) => {
  await openPlace(page);
  const selectors = [
    '#fixtureMapTool',
    '#yearButton',
    '#historySearch',
    '#searchSubmit',
    '#placeSheetHandle',
    '#placeClose',
    '#placeExpand',
    '#fixtureRange'
  ];

  for (const selector of selectors) {
    const rect = await page.locator(selector).evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    expect(rect.height, `${selector} height`).toBeGreaterThanOrEqual(43.5);
    if (['#fixtureMapTool', '#searchSubmit', '#placeClose'].includes(selector)) {
      expect(rect.width, `${selector} width`).toBeGreaterThanOrEqual(43.5);
    }
  }
});

test('keeps full place details inside the visual viewport without page overflow', async ({ page }) => {
  await openPlace(page);
  await page.locator('#placeExpand').click();
  await page.locator('#placeExpand').click();
  await expect(page.locator('#placeSheet')).toHaveAttribute('data-detent', 'full');

  const layout = await page.evaluate(() => {
    const rect = document.querySelector('#placeSheet').getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      rect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.rect.left).toBeGreaterThanOrEqual(-1);
  expect(layout.rect.top).toBeGreaterThanOrEqual(-1);
  expect(layout.rect.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.rect.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
});

test('preserves near-instant state feedback under Reduced Motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#yearButton').click();
  const duration = await page.locator('.map-tool-stack').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(durationSeconds(duration)).toBeLessThanOrEqual(0.001);
});
