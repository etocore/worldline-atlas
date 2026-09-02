import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/timeline-domain-switch.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
}

test.beforeEach(async ({ page }) => openFixture(page));

test('keeps timeline text compact and above the globe', async ({ page }) => {
  const launcher = page.locator('#yearButton');
  const chapter = page.locator('#timelineEraCard');
  const chapterToggle = page.locator('#timelineChapterDisclosure');
  const chapterDetails = page.locator('#timelineChapterDetails');

  await expect(launcher).toHaveClass(/timeline-disclosure-launcher/);
  await expect(launcher.locator('#eraLabel')).toHaveText('Earth History');
  await expect(launcher.locator('#yearLabel')).toBeHidden();
  await expect(launcher.locator('.time-chip-icon')).toHaveCount(0);

  await expect(chapter).toHaveClass(/timeline-chapter-disclosure/);
  await expect(chapterToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(chapterDetails).toBeHidden();
  await expect(chapter.locator('#timelineEraTitle')).toHaveText('Life moves from sea to land');

  const geometry = await page.evaluate(() => {
    const launcher = document.querySelector('#yearButton').getBoundingClientRect();
    const chapter = document.querySelector('#timelineEraCard').getBoundingClientRect();
    const identity = getComputedStyle(document.querySelector('.map-identity'));
    const chapterStyle = getComputedStyle(document.querySelector('#timelineEraCard'));
    const globe = getComputedStyle(document.querySelector('.fixture-globe'));
    return {
      launcherWidth: launcher.width,
      launcherHeight: launcher.height,
      chapterHeight: chapter.height,
      identityZ: Number(identity.zIndex),
      chapterZ: Number(chapterStyle.zIndex),
      globeZ: Number(globe.zIndex)
    };
  });

  expect(geometry.launcherHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.launcherHeight).toBeLessThanOrEqual(46);
  expect(geometry.launcherWidth).toBeLessThanOrEqual(168);
  expect(geometry.chapterHeight).toBeGreaterThanOrEqual(48);
  expect(geometry.chapterHeight).toBeLessThanOrEqual(52);
  expect(geometry.identityZ).toBeGreaterThan(geometry.globeZ);
  expect(geometry.chapterZ).toBeGreaterThan(geometry.globeZ);

  await chapterToggle.click();
  await expect(chapterToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(chapterDetails).toBeVisible();
  expect(await chapter.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(90);

  await chapterToggle.click();
  await expect(chapterToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(chapterDetails).toBeHidden();
});

test('survives repeated Earth and Human History switches', async ({ page }) => {
  await page.locator('#yearButton').click();
  const earth = page.locator('#timelineEarthMode');
  const human = page.locator('#timelineHumanMode');
  const chapterToggle = page.locator('#timelineChapterDisclosure');

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await human.click();
    await expect(page.locator('body')).toHaveAttribute('data-timeline-mode', 'human');
    await expect(human).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#eraLabel')).toHaveText('Human History');
    await expect(page.locator('.timeline-chapter-domain')).toHaveText('Human History');
    await expect(chapterToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#timelineIntervalRail [data-interval-id]')).toHaveCount(7);

    const humanState = await page.evaluate(() => ({
      state: WorldlineTimelineState.getState(),
      engineMode: WorldlineEarthHistory.getMode(),
      paleo: window.__fixtureVisibility.get('paleo-land-fill'),
      curated: window.__fixtureVisibility.get('curated-settlement-halo'),
      historical: window.__fixtureVisibility.get('historical-settlement')
    }));
    expect(humanState.state.domain).toBe('human');
    expect(humanState.state.interaction).toBe('idle');
    expect(humanState.engineMode).toBe('human');
    expect(humanState.paleo).toBe('none');
    expect(humanState.curated).toBe('visible');
    expect(humanState.historical).toBe('visible');

    await earth.click();
    await expect(page.locator('body')).toHaveAttribute('data-timeline-mode', 'earth');
    await expect(earth).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#eraLabel')).toHaveText('Earth History');
    await expect(page.locator('.timeline-chapter-domain')).toHaveText('Earth History');
    await expect(chapterToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#timelineIntervalRail [data-interval-id]')).toHaveCount(17);

    const earthState = await page.evaluate(() => ({
      state: WorldlineTimelineState.getState(),
      engineMode: WorldlineEarthHistory.getMode(),
      paleo: window.__fixtureVisibility.get('paleo-land-fill'),
      curated: window.__fixtureVisibility.get('curated-settlement-halo'),
      historical: window.__fixtureVisibility.get('historical-settlement')
    }));
    expect(earthState.state.domain).toBe('earth');
    expect(earthState.state.interaction).toBe('idle');
    expect(earthState.engineMode).toBe('earth');
    expect(earthState.paleo).toBe('visible');
    expect(earthState.curated).toBe('none');
    expect(earthState.historical).toBe('none');
  }

  expect(await page.evaluate(() => window.__legacyModeFailures)).toBeGreaterThanOrEqual(6);
});

test('cancels an active scrub before changing domains', async ({ page }) => {
  await page.locator('#yearButton').click();

  await page.evaluate(() => {
    const slider = document.querySelector('#timelinePrimarySlider');
    slider.setPointerCapture = () => {};
    slider.releasePointerCapture = () => {};
    slider.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      pointerId: 9,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1
    }));
    slider.value = '740';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('body')).toHaveClass(/timeline-scrubbing/);

  await page.locator('#timelineHumanMode').click();

  const result = await page.evaluate(() => ({
    state: WorldlineTimelineState.getState(),
    scrubbing: document.body.classList.contains('timeline-scrubbing'),
    mode: WorldlineEarthHistory.getMode()
  }));

  expect(result.state.domain).toBe('human');
  expect(result.state.interaction).toBe('idle');
  expect(result.scrubbing).toBe(false);
  expect(result.mode).toBe('human');
});
