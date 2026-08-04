import { test, expect } from '@playwright/test';

const fixturePath = '/tests/fixtures/ios-interface.html';

async function openFixture(page) {
  await page.goto(fixturePath);
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true');
}

async function openSettings(page) {
  await page.evaluate(() => {
    window.WorldlineUI.activate('settings', { options: {} }, { reason: 'surface-visual-test' });
  });
  await expect(page.locator('#searchShell')).toHaveClass(/is-open/);
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

test.beforeEach(async ({ page }) => openFixture(page));

test('presents settings as one continuous hierarchy instead of nested cards', async ({ page }) => {
  await openSettings(page);
  const hierarchy = await page.evaluate(() => {
    const metric = getComputedStyle(document.querySelector('.metric-grid'));
    const timeline = getComputedStyle(document.querySelector('.timeline-block'));
    const control = getComputedStyle(document.querySelector('.control-block'));
    const grid = getComputedStyle(document.querySelector('.control-grid'));
    const panel = document.querySelector('#controlPanel');
    return {
      metricRadius: metric.borderRadius,
      metricBackground: metric.backgroundColor,
      timelineRadius: timeline.borderRadius,
      timelineBackground: timeline.backgroundColor,
      controlRadius: control.borderRadius,
      controlBackground: control.backgroundColor,
      gridColumns: grid.gridTemplateColumns,
      panelScrollWidth: panel.scrollWidth,
      panelClientWidth: panel.clientWidth
    };
  });
  expect(hierarchy.metricRadius).toBe('0px');
  expect(hierarchy.metricBackground).toBe('rgba(0, 0, 0, 0)');
  expect(hierarchy.timelineRadius).toBe('0px');
  expect(hierarchy.timelineBackground).toBe('rgba(0, 0, 0, 0)');
  expect(hierarchy.controlRadius).toBe('0px');
  expect(hierarchy.controlBackground).toBe('rgba(0, 0, 0, 0)');
  expect(hierarchy.gridColumns.split(' ').length).toBe(1);
  expect(hierarchy.panelScrollWidth).toBeLessThanOrEqual(hierarchy.panelClientWidth + 1);
});

test('keeps place evidence content-led instead of wrapping it in another card', async ({ page }) => {
  await openPlace(page);
  const presentation = await page.evaluate(() => {
    const fact = getComputedStyle(document.querySelector('.place-fact'));
    const evidence = getComputedStyle(document.querySelector('.place-evidence'));
    const label = getComputedStyle(document.querySelector('.place-summary-label'));
    return {
      factRadius: fact.borderRadius,
      factBackground: fact.backgroundColor,
      evidenceRadius: evidence.borderRadius,
      evidenceBackground: evidence.backgroundColor,
      evidenceBorderLeft: evidence.borderLeftWidth,
      summaryLabelDisplay: label.display
    };
  });
  expect(presentation.factRadius).toBe('0px');
  expect(presentation.factBackground).toBe('rgba(0, 0, 0, 0)');
  expect(presentation.evidenceRadius).toBe('0px');
  expect(presentation.evidenceBackground).toBe('rgba(0, 0, 0, 0)');
  expect(presentation.evidenceBorderLeft).toBe('2px');
  expect(presentation.summaryLabelDisplay).toBe('none');
});

test('keeps the canonical search surface compact and inside the viewport', async ({ page }) => {
  await page.locator('#historySearch').focus();
  await expect(page.locator('#searchSuggestions')).toHaveAttribute('data-open', 'true');
  const presentation = await page.evaluate(() => {
    const suggestions = getComputedStyle(document.querySelector('#searchSuggestions'));
    const shell = document.querySelector('#searchShell').getBoundingClientRect();
    return {
      suggestionRadius: Number.parseFloat(suggestions.borderRadius),
      shellLeft: shell.left,
      shellRight: shell.right,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    };
  });
  expect(presentation.suggestionRadius).toBe(18);
  expect(presentation.shellLeft).toBeGreaterThanOrEqual(-1);
  expect(presentation.shellRight).toBeLessThanOrEqual(presentation.innerWidth + 1);
  expect(presentation.scrollWidth).toBeLessThanOrEqual(presentation.innerWidth + 1);
});
