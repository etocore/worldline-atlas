import { defineConfig } from '@playwright/test';

const mobileSafari = (viewport) => ({
  browserName: 'webkit',
  viewport,
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  locale: 'en-US',
  colorScheme: 'dark'
});

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'mobile-safari-compact',
      use: mobileSafari({ width: 375, height: 667 })
    },
    {
      name: 'mobile-safari-large',
      use: mobileSafari({ width: 430, height: 932 })
    },
    {
      name: 'ipad-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        locale: 'en-US',
        colorScheme: 'dark'
      }
    }
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/tests/fixtures/ios-interface.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
