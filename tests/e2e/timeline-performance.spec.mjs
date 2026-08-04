import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/fixtures/timeline-canonical.html');
  await expect(page.locator('body')).toHaveAttribute('data-fixture-ready', 'true');
}

test.beforeEach(async ({ page }) => openFixture(page));

test('keeps timeline scrubbing inside the r30 interaction budgets', async ({ page }) => {
  await page.locator('#yearButton').click();

  await page.evaluate(async () => {
    WorldlinePerformance.reset();
    const slider = document.querySelector('#timelinePrimarySlider');
    slider.setPointerCapture = () => {};
    slider.releasePointerCapture = () => {};

    slider.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true
    }));

    for (const value of [120, 320, 520, 720]) {
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 85));
    }

    slider.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true
    }));
  });

  await page.waitForTimeout(440);
  const result = await page.evaluate(() => WorldlinePerformance.evaluate());

  expect(result.pass, result.violations.join('\n')).toBe(true);
  expect(result.metrics.inputCount).toBe(4);
  expect(result.metrics.inputToRenderP95Ms).toBeLessThanOrEqual(50);
  expect(result.metrics.inputToPaintP95Ms).toBeLessThanOrEqual(100);
  expect(result.metrics.maxFrameGapMs).toBeLessThanOrEqual(100);
  expect(result.metrics.previewRequests).toBeLessThanOrEqual(4);
  expect(result.metrics.postReleaseRequests).toBeLessThanOrEqual(1);
  expect(result.metrics.sourceRemovals).toBe(0);
  expect(result.metrics.commits).toBe(1);
  expect(result.metrics.abortedRequests).toBeGreaterThanOrEqual(1);
  await expect(page.locator('body')).not.toHaveClass(/timeline-scrubbing/);
});

test('exposes the performance contract to production diagnostics', async ({ page }) => {
  const contract = await page.evaluate(() => ({
    build: WorldlinePerformance.BUILD,
    budgets: WorldlinePerformance.BUDGETS,
    globalBuild: window.__WORLDLINE_PERFORMANCE_BUILD__
  }));

  expect(contract.build).toBe('2026-08-04-globe-r30');
  expect(contract.globalBuild).toBe(contract.build);
  expect(contract.budgets).toEqual({
    inputToRenderP95Ms: 50,
    inputToPaintP95Ms: 100,
    maxFrameGapMs: 100,
    maxPreviewRequestsPerGesture: 4,
    maxPostReleaseRequests: 1,
    maxSourceRemovalsDuringGesture: 0,
    maxCommitsPerGesture: 1
  });
});
