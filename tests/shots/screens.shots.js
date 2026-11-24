// Visual check: captures the calculator's main states at three screen sizes into shots/<size>/.
// Nothing here asserts on looks — the pictures are for a person (or Claude) to look over
// for things the other tests can't see: glyphs overflowing, notes cut off, a cramped phone
// layout. Run with `npm run shots`; the folder is git-ignored. Named *.shots.js so
// `npm run test:browser` (which runs *.spec.js) leaves it alone.
const path = require('node:path');
const { test } = require('@playwright/test');

const SIZES = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
};

const press = async (page, ...names) => {
  for (const name of names) await page.getByRole('button', { name, exact: true }).click();
};

// Each scene gets the page to one state; the test then saves a full-page picture of it
const SCENES = {
  '01-start': async () => {},
  '02-answer': async (page) => {
    await press(page, '1', '2', 'Add', '3', 'Equals');
  },
  '03-largest-number': async (page) => {
    await page.keyboard.type('9999999');                       // every sign, nine times
  },
  '04-glyph-info': async (page) => {
    await page.keyboard.type('1204');
    await page.locator('#hieroglyph-num .glyph').first().hover();
  },
  '05-unit-fractions': async (page) => {
    await press(page, 'Unit fractions');
    await page.keyboard.type('2/7');
  },
  '06-fraction-info': async (page) => {
    await press(page, 'Unit fractions');
    await page.keyboard.type('1+5/6');
    await page.locator('#hieroglyph-num .glyph').nth(1).click();
  },
  '07-negative': async (page) => {
    await page.keyboard.type('5*-3');
    await page.keyboard.press('Enter');
  },
  '08-too-big': async (page) => {
    await page.keyboard.type('99999999');
  },
  '09-long-expression': async (page) => {
    await page.keyboard.type('(1234+5678)*(91011-1213)/1415');
  },
};

for (const [size, viewport] of Object.entries(SIZES)) {
  test.describe(size, () => {
    test.use({ viewport });
    for (const [name, setUp] of Object.entries(SCENES)) {
      test(name, async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());   // fraction toggle is remembered
        await page.reload();
        await setUp(page);
        await page.waitForTimeout(400);   // let the preview and tooltips settle
        await page.screenshot({
          path: path.join(__dirname, '..', '..', 'shots', size, `${name}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      });
    }
  });
}
