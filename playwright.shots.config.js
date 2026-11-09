// Screenshots for a visual look-over: `npm run shots` → shots/<desktop|tablet|phone>/*.png
// Chromium only, kept out of `npm run test:browser` and CI.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4174;   // beside the browser tests (4173) and EgyptianChess (4183/4184)

module.exports = defineConfig({
  testDir: 'tests/shots',
  testMatch: '*.shots.js',
  timeout: 60_000,
  workers: 2,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    stderr: 'ignore',
  },
});
