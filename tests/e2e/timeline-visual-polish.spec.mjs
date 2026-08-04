import { expect, test } from '@playwright/test';

async function openTimelineFixture(page) {
  await page.goto('/tests/fixtures/timeline-r23.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
  await page.addStyleTag({ url: 'http://127.0.0.1:4173/timeline-interface-r27.css' });
}

test.beforeEach(async ({ page }) => {
  await openTimelineFixture(page);
});

test('keeps a full-word geological date clear of the close button', async ({ page }) => {
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/time-language-r25.js' });
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(830.3, { source: 'r27-visual-test' }));

  await expect(page.locator('#timelineHudValue')).toHaveText('830.3 million years ago');
  await expect(page.locator('#timelineBreadcrumb')).toContainText('Proterozoic');
  await expect(page.locator('#timelineBreadcrumb')).toContainText('Neoproterozoic');
  await expect(page.locator('#timelineHudEra')).toBeHidden();

  const geometry = await page.evaluate(() => {
    const hud = document.querySelector('#timelineHud').getBoundingClientRect();
    const header = document.querySelector('.timeline-r23-header').getBoundingClientRect();
    const breadcrumb = document.querySelector('#timelineBreadcrumb').getBoundingClientRect();
    const value = document.querySelector('#timelineHudValue');
    const valueRect = value.getBoundingClientRect();
    const close = document.querySelector('#timelineHudClose').getBoundingClientRect();
    return {
      hudLeft: hud.left,
      headerLeft: header.left,
      breadcrumbLeft: breadcrumb.left,
      valueLeft: valueRect.left,
      valueRight: valueRect.right,
      closeLeft: close.left,
      valueScrollWidth: value.scrollWidth,
      valueClientWidth: value.clientWidth,
      headerHeight: header.height
    };
  });

  expect(geometry.breadcrumbLeft - geometry.hudLeft).toBeGreaterThanOrEqual(10);
  expect(geometry.breadcrumbLeft - geometry.hudLeft).toBeLessThan(34);
  expect(Math.abs(geometry.valueLeft - geometry.breadcrumbLeft)).toBeLessThanOrEqual(2);
  expect(geometry.valueRight).toBeLessThanOrEqual(geometry.closeLeft - 6);
  expect(geometry.valueScrollWidth).toBeLessThanOrEqual(geometry.valueClientWidth + 1);
  expect(geometry.headerHeight).toBeGreaterThanOrEqual(68);
});

test('renders the map time control as a compact, descriptive launcher', async ({ page }) => {
  await page.evaluate(() => {
    document.body.classList.remove('timeline-active');
    document.querySelector('#timelineHud').dataset.open = 'false';
    document.querySelector('.map-stage').insertAdjacentHTML('beforeend', `
      <div class="map-identity">
        <button id="brandButton" class="brand-orb" type="button" aria-label="Open Worldline controls">W</button>
        <button id="yearButton" class="year-chip" type="button" aria-label="Open historical timeline">
          <span id="eraLabel">Earth history</span>
          <strong id="yearLabel">250 Ma</strong>
        </button>
      </div>
    `);
  });
  await page.addStyleTag({ url: 'http://127.0.0.1:4173/time-control-r16.css' });
  await page.addStyleTag({ url: 'http://127.0.0.1:4173/timeline-interface-r27.css' });
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/time-control-r16.js' });

  await expect.poll(() => page.evaluate(() => window.__WORLDLINE_TIME_CONTROL_BUILD__)).toBe('2026-08-04-globe-r27');
  await page.evaluate(() => WorldlineTimelineState.setEarthAge(538.8, { source: 'r27-launcher-test' }));

  const launcher = page.locator('#yearButton');
  await expect(launcher.locator('#eraLabel')).toHaveText('Earth history');
  await expect(launcher.locator('#yearLabel')).toHaveText('538.8 Ma');
  await expect(launcher).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(launcher).toHaveAttribute('aria-controls', 'timelineHud');
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await expect(launcher).toHaveAttribute('aria-label', /Open Earth history timeline at 538\.8 million years ago/);

  const geometry = await launcher.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const icon = element.querySelector('.time-chip-icon').getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      iconWidth: icon.width,
      iconHeight: icon.height,
      maxWidth: parseFloat(getComputedStyle(element).maxWidth),
      display: getComputedStyle(element).display
    };
  });

  expect(geometry.display).toBe('grid');
  expect(geometry.width).toBeLessThanOrEqual(217);
  expect(geometry.width).toBeGreaterThan(112);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeLessThanOrEqual(58);
  expect(geometry.iconWidth).toBe(28);
  expect(geometry.iconHeight).toBe(28);

  await page.evaluate(() => document.body.classList.add('timeline-active'));
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
});

test('keeps the launcher concise while preserving the full accessible date', async ({ page }) => {
  await page.evaluate(() => {
    document.body.classList.remove('timeline-active');
    document.querySelector('.map-stage').insertAdjacentHTML('beforeend', `
      <div class="map-identity">
        <button id="yearButton" class="year-chip" type="button">
          <span id="eraLabel"></span>
          <strong id="yearLabel"></strong>
        </button>
      </div>
    `);
  });
  await page.addStyleTag({ url: 'http://127.0.0.1:4173/time-control-r16.css' });
  await page.addStyleTag({ url: 'http://127.0.0.1:4173/timeline-interface-r27.css' });
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/time-control-r16.js' });
  await expect.poll(() => page.evaluate(() => window.__WORLDLINE_TIME_CONTROL_BUILD__)).toBe('2026-08-04-globe-r27');

  await page.evaluate(() => WorldlineTimelineState.setEarthAge(830.3, { source: 'r27-copy-test' }));
  await expect(page.locator('#yearLabel')).toHaveText('830.3 Ma');
  await expect(page.locator('#yearButton')).toHaveAttribute('aria-label', /830\.3 million years ago/);

  await page.evaluate(() => WorldlineTimelineState.setDomain('human', { source: 'r27-copy-test' }));
  await page.evaluate(() => WorldlineTimelineState.setHumanYear(1995, { source: 'r27-copy-test' }));
  await expect(page.locator('#eraLabel')).toHaveText('Human history');
  await expect(page.locator('#yearLabel')).toHaveText('1,995 CE');
  await expect(page.locator('#yearButton')).toHaveAttribute('aria-label', /Open Human history timeline at 1,995 CE/);
});
