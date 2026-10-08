// Drives the real page in a browser: npm run test:browser
const { test, expect } = require('@playwright/test');

let pageErrors;

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('/');
});

test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

const display = page => page.locator('#expression');
const preview = page => page.locator('#result');
const glyphs = page => page.locator('#hieroglyph-num');
const note = page => page.locator('#hieroglyph-note');

async function press(page, ...names) {
  for (const name of names) {
    await page.getByRole('button', { name, exact: true }).click();
  }
}

test('buttons calculate and show the answer in hieroglyphs', async ({ page }) => {
  await press(page, '1', '2', 'Add', '3');
  await expect(preview(page)).toHaveText('= 15');
  await press(page, 'Equals');
  await expect(display(page)).toHaveText('15');
  await expect(glyphs(page)).toHaveText('𓎆𓏺𓏺𓏺𓏺𓏺');
  await expect(note(page)).toHaveText('');
});

test('every function button works', async ({ page }) => {
  await press(page, '5', '0', 'Add', '1', '0', 'Percent');
  await expect(display(page)).toHaveText('50+5');
  await press(page, 'Equals', 'Toggle sign');
  await expect(display(page)).toHaveText('-55');
  await expect(note(page)).toHaveText('negative');
  await press(page, 'All clear', 'Decimal point', '5', 'Multiply', '4', 'Subtract', '1', 'Divide', '2', 'Equals');
  await expect(display(page)).toHaveText('1.5');
});

test('keyboard input, including negative operands', async ({ page }) => {
  await page.keyboard.type('5*-3');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('-15');
  await expect(note(page)).toHaveText('negative');
  await page.keyboard.type('+20/4=');
  await expect(display(page)).toHaveText('-10');
  await page.keyboard.press('Backspace');
  await expect(display(page)).toHaveText('-1');
});

test('Escape, Delete and C all clear', async ({ page }) => {
  for (const key of ['Escape', 'Delete', 'c', 'C']) {
    await page.keyboard.type('42');
    await page.keyboard.press(key);
    await expect(display(page), key).toHaveText('0');
  }
});

test('Enter calculates instead of re-clicking the last button', async ({ page }) => {
  // The focused "1" button must not be clicked again, which would start a new number
  await press(page, '7', 'Add', '1');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('8');
});

test('dividing by zero shows Infinity and starts fresh', async ({ page }) => {
  await page.keyboard.type('5/0');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('Infinity');
  await page.keyboard.type('2');
  await expect(display(page)).toHaveText('2');
});

test('unit-fraction toggle uses the 2/3 sign and is remembered', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Unit fractions' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.type('1+5/6');
  await expect(note(page)).toHaveText('≈ rounded');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(glyphs(page)).toHaveText('𓏺 𓂌 𓂋𓏺𓏺𓏺𓏺𓏺𓏺');
  await expect(note(page)).toHaveText('1 + 2/3 + 1/6');

  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('f');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('hovering or tapping a glyph shows what it is worth', async ({ page }) => {
  const info = page.locator('#glyph-info');
  await page.keyboard.type('1204');
  await expect(note(page)).toBeVisible();
  const signs = glyphs(page).locator('.glyph');
  await expect(signs).toHaveCount(7);

  await signs.first().hover();
  await expect(info).toHaveText('𓆼 lotus flower · 1,000');
  await expect(note(page)).toBeHidden();
  await expect(signs.first()).toHaveClass(/active/);

  await signs.nth(1).click();
  await expect(info).toHaveText('𓍢 coiled rope · 100');

  // Clicking elsewhere, or moving the mouse away, puts the note back
  await page.locator('.temple-header').click();
  await expect(info).toHaveText('');
  await expect(note(page)).toBeVisible();
});

test('fractions are explained as a whole', async ({ page }) => {
  await page.getByRole('button', { name: 'Unit fractions' }).click();
  await page.keyboard.type('1+5/6');
  const signs = glyphs(page).locator('.glyph');
  await signs.nth(1).click();
  await expect(page.locator('#glyph-info')).toHaveText('𓂌 2/3');
  await signs.nth(2).click();
  await expect(page.locator('#glyph-info')).toHaveText('𓂋𓏺𓏺𓏺𓏺𓏺𓏺 1/6');
});

test('the glyph line has a spoken reading and shows it on keyboard focus', async ({ page }) => {
  const line = page.getByRole('img', { name: '1 × lotus flower (1,000), 2 × coiled rope (100), 4 × stroke (1)' });
  await page.keyboard.type('1204');
  await expect(line).toBeVisible();
  await line.focus();
  await expect(page.locator('#glyph-info')).toHaveText(
    '1 × lotus flower (1,000), 2 × coiled rope (100), 4 × stroke (1)');
  // With no glyphs the line drops out of the Tab order
  await page.keyboard.press('Escape');
  await expect(glyphs(page)).not.toHaveAttribute('tabindex');
  await expect(glyphs(page)).not.toHaveAttribute('role');
});

test('hieroglyphs render in the hieroglyph web font', async ({ page }) => {
  // The font only downloads if the page's CSS actually uses it for glyphs
  await page.keyboard.type('12');
  await expect.poll(() => page.evaluate(() => [...document.fonts]
    .filter(f => f.family.includes('Egyptian Hieroglyphs'))
    .map(f => f.status))).toContain('loaded');
});

test('every button has an accessible name', async ({ page }) => {
  // The names a screen reader announces, so decorative glyphs must not leak in
  const expected = [
    'Unit fractions', 'All clear', 'Toggle sign', 'Percent', 'Divide',
    '7', '8', '9', 'Multiply', '4', '5', '6', 'Subtract',
    '1', '2', '3', 'Add', '0', 'Decimal point', 'Equals',
  ];
  const buttons = page.getByRole('button');
  await expect(buttons).toHaveCount(expected.length);
  for (const [i, name] of expected.entries()) {
    await expect(buttons.nth(i)).toHaveAccessibleName(name);
  }
});

for (const width of [320, 375, 1280]) {
  test(`fits a ${width}px-wide screen without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);
    for (const selector of ['.left-pillar', '.calculator', '.right-pillar']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x, selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
    }
  });
}
