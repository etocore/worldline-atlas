import { expect, test } from '@playwright/test';

async function loadLanguageLayer(page) {
  await page.goto('/tests/fixtures/ios-interface.html');
  await page.addScriptTag({ url: '/time-language-r25.js' });
  await page.waitForFunction(() => Boolean(globalThis.WorldlineTimeLanguage));
}

test('spells out billion, million, and thousand year units', async ({ page }) => {
  await loadLanguageLayer(page);

  await page.evaluate(() => {
    let timeline = document.querySelector('#timelineHud');
    if (!timeline) {
      timeline = document.createElement('section');
      timeline.id = 'timelineHud';
      document.body.appendChild(timeline);
    }
    timeline.innerHTML = `
      <h2 id="timelineHudValue">420 Ma</h2>
      <span id="timelineRangeStart">4.57 Ga</span>
      <span id="timelineRangeEnd">12 ka</span>
      <span id="timelineRenderStatus">Reconstructing 250 Ma</span>
      <input id="timelinePrimarySlider" type="range" aria-valuetext="420 Ma" />
    `;
  });

  await expect(page.locator('#timelineHudValue')).toHaveText('420 million years ago');
  await expect(page.locator('#timelineRangeStart')).toHaveText('4.57 billion years ago');
  await expect(page.locator('#timelineRangeEnd')).toHaveText('12 thousand years ago');
  await expect(page.locator('#timelineRenderStatus')).toHaveText('Reconstructing 250 million years ago');
  await expect(page.locator('#timelinePrimarySlider')).toHaveAttribute('aria-valuetext', '420 million years ago');
});

test('keeps expanded wording through repeated timeline rewrites', async ({ page }) => {
  await loadLanguageLayer(page);

  await page.evaluate(() => {
    let timeline = document.querySelector('#timelineHud');
    if (!timeline) {
      timeline = document.createElement('section');
      timeline.id = 'timelineHud';
      document.body.appendChild(timeline);
    }
    timeline.innerHTML = '<h2 id="timelineHudValue">1.25 Ga</h2><input id="timelinePrimarySlider" type="range" />';
  });

  await expect(page.locator('#timelineHudValue')).toHaveText('1.25 billion years ago');

  await page.locator('#timelineHudValue').evaluate((element) => {
    element.textContent = '66 Ma';
  });
  await expect(page.locator('#timelineHudValue')).toHaveText('66 million years ago');

  await page.locator('#timelineHudValue').evaluate((element) => {
    element.textContent = '850 ka';
  });
  await expect(page.locator('#timelineHudValue')).toHaveText('850 thousand years ago');
  await expect(page.locator('#timelineHudValue')).not.toContainText(/\b(?:Ga|Ma|ka)\b/);
});
