// Browser tests: npm run test:browser
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.js',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
  },
  // Desktop engines plus phone-sized touch screens; WebKit is Safari's
  // engine and the one every iPhone browser uses
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  // Serve over http so the page runs as it does on GitHub Pages
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    stderr: 'ignore',
  },
});
