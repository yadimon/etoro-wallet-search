import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './wallet-search/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 7000 },
  outputDir: './test-results/wallet',
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/wallet-report.json' }],
    ['html', { outputFolder: 'test-results/wallet-report', open: 'never' }],
  ],
  projects: [
    { name: 'berlin', use: { timezoneId: 'Europe/Berlin' } },
    { name: 'new-york', use: { timezoneId: 'America/New_York' } },
  ],
});
