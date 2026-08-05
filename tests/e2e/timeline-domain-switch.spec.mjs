import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/timeline-domain-switch.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
}

test.beforeEach(async ({ page }) => openFixture(page));

test('keeps the timeline launcher compact and above the globe', async ({ page }) => {
  const launcher = page.locator('#yearButton');

  await expect(launcher).toHaveClass(/timeline-disclosure-launcher/);
  await expect(launcher.locator('#eraLabel')).toHaveText('Earth History');
  await expect(launcher.locator('#yearLabel')).toBeHidden();
  await expect(launcher.locator('.time-chip-icon')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const launcher = document.querySelector('#yearButton').getBoundingClientRect();
    const identity = getComputedStyle(document.querySelector('.map-identity'));
    const globe = getComputedStyle(document.querySelector('.fixture-globe'));
    return {
      width: launcher.width,
      height: launcher.height,
      identityZ: Number(identity.zIndex),
      globeZ: Number(globe.zIndex)
    };
  });

  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeLessThanOrEqual(46);
  expect(geometry.width).toBeLessThanOrEqual(168);
  expect(geometry.identityZ).toBeGreaterThan(geometry.globeZ);
});

test('survives repeated Earth and Human History switches', async ({ page }) => {
  await page.locator('#yearButton').click();
  const earth = page.locator('#timelineEarthMode');
  const human = page.locator('#timelineHumanMode');

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await human.click();
    await expect(page.locator('body')).toHaveAttribute('data-timeline-mode', 'human');
    await expect(human).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#eraLabel')).toHaveText('Human History');
    await expect(page.locator('#timelineIntervalRail [data-interval-id]')).toHaveCount(7);

    const humanState = await page.evaluate(() => ({
      state: WorldlineTimelineState.getState(),
      engineMode: WorldlineEarthHistory.getMode(),
      paleo: window.__fixtureVisibility.get('paleo-land-fill'),
      curated: window.__fixtureVisibility.get('curated-settlement-halo')
    }));
    expect(humanState.state.domain).toBe('human');
    expect(humanState.state.interaction).toBe('idle');
    expect(humanState.engineMode).toBe('human');
    expect(humanState.paleo).toBe('none');
    expect(humanState.curated).toBe('visible');

    await earth.click();
    await expect(page.locator('body')).toHaveAttribute('data-timeline-mode', 'earth');
    await expect(earth).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#eraLabel')).toHaveText('Earth History');
    await expect(page.locator('#timelineIntervalRail [data-interval-id]')).toHaveCount(17);

    const earthState = await page.evaluate(() => ({
      state: WorldlineTimelineState.getState(),
      engineMode: WorldlineEarthHistory.getMode(),
      paleo: window.__fixtureVisibility.get('paleo-land-fill'),
      curated: window.__fixtureVisibility.get('curated-settlement-halo')
    }));
    expect(earthState.state.domain).toBe('earth');
    expect(earthState.state.interaction).toBe('idle');
    expect(earthState.engineMode).toBe('earth');
    expect(earthState.paleo).toBe('visible');
    expect(earthState.curated).toBe('none');
  }

  expect(await page.evaluate(() => window.__legacyModeFailures)).toBeGreaterThanOrEqual(6);
});

test('cancels an active scrub before changing domains', async ({ page }) => {
  await page.locator('#yearButton').click();
  const slider = page.locator('#timelinePrimarySlider');

  await slider.dispatchEvent('pointerdown', {
    pointerId: 9,
    pointerType: 'touch',
    isPrimary: true
  });
  await slider.evaluate((element) => {
    element.value = '740';
    element.dispatchEvent(new Event('input', { bubbles: true }));
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
