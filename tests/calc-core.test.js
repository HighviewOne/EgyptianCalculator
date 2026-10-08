// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toEgyptian, toFraction, unitFractions, describeHieroglyph, formatNum, evalExpression,
  withDigit, withOp, withDecimal, withPercent,
} = require('../calc-core.js');

// Builds an expression from button presses, e.g. type('5×−3')
// (operators use the calculator's own symbols: ÷ × − +)
function type(keys) {
  let expr = '';
  for (const k of keys) {
    if (k >= '0' && k <= '9') expr = withDigit(expr, k);
    else if (k === '.') expr = withDecimal(expr);
    else expr = withOp(expr, k);
  }
  return expr;
}

const calc = keys => evalExpression(type(keys));

// Reads hieroglyphs back into a number, to check toEgyptian round-trips
const GLYPH_VALUES = { '𓁨': 1e6, '𓆐': 1e5, '𓂭': 1e4, '𓆼': 1e3, '𓍢': 100, '𓎆': 10, '𓏺': 1 };
const fromEgyptian = s => [...s].reduce((sum, g) => sum + GLYPH_VALUES[g], 0);

test('toEgyptian builds numbers from the seven signs', () => {
  assert.equal(toEgyptian(1), '𓏺');
  assert.equal(toEgyptian(1234), '𓆼𓍢𓍢𓎆𓎆𓎆𓏺𓏺𓏺𓏺');
  assert.equal(toEgyptian(1000000), '𓁨');
  assert.equal(toEgyptian(9999999), '𓁨'.repeat(9) + '𓆐'.repeat(9) + '𓂭'.repeat(9)
    + '𓆼'.repeat(9) + '𓍢'.repeat(9) + '𓎆'.repeat(9) + '𓏺'.repeat(9));
});

test('toEgyptian round-trips across the supported range', () => {
  for (const n of [1, 9, 10, 99, 101, 4560, 70809, 123456, 9000001, 9999999]) {
    assert.equal(fromEgyptian(toEgyptian(n)), n, `n = ${n}`);
  }
});

test('toEgyptian returns nothing for values it cannot show', () => {
  for (const n of [0, -5, 2.5, 10000000, Infinity, NaN]) {
    assert.equal(toEgyptian(n), '', `n = ${n}`);
  }
});

test('describeHieroglyph flags negative, rounded, zero and too-large results', () => {
  assert.deepEqual(describeHieroglyph(5), { glyphs: '𓏺𓏺𓏺𓏺𓏺', note: '' });
  assert.deepEqual(describeHieroglyph(-5), { glyphs: '𓏺𓏺𓏺𓏺𓏺', note: 'negative' });
  assert.deepEqual(describeHieroglyph(2.6), { glyphs: '𓏺𓏺𓏺', note: '≈ rounded' });
  assert.deepEqual(describeHieroglyph(-2.5), { glyphs: '𓏺𓏺𓏺', note: 'negative · ≈ rounded' });
  assert.deepEqual(describeHieroglyph(0), { glyphs: '', note: 'no hieroglyph for zero' });
  assert.deepEqual(describeHieroglyph(0.4), { glyphs: '', note: 'rounds to 0 — no hieroglyph for zero' });
  assert.deepEqual(describeHieroglyph(12000000), { glyphs: '', note: 'too large for hieroglyphs' });
  assert.deepEqual(describeHieroglyph(Infinity), { glyphs: '', note: '' });
});

test('formatNum trims floating point noise', () => {
  assert.equal(formatNum(0.1 + 0.2), '0.3');
  assert.equal(formatNum(-15), '-15');
  assert.equal(formatNum(1e21), '1e+21');
  assert.equal(formatNum(Infinity), 'Infinity');
  assert.equal(formatNum(-Infinity), '-Infinity');
  assert.equal(formatNum(NaN), 'NaN');
});

test('evalExpression handles the calculator symbols', () => {
  assert.equal(evalExpression('8÷2'), 4);
  assert.equal(evalExpression('3×4'), 12);
  assert.equal(evalExpression('3−8'), -5);
  assert.equal(evalExpression('5−-3'), 8);
  assert.equal(evalExpression('1e+21+1'), 1e21);
  assert.equal(evalExpression('5÷0'), Infinity);
});

test('evalExpression follows operator precedence and parentheses', () => {
  assert.equal(evalExpression('2+3×4'), 14);
  assert.equal(evalExpression('(2+3)×4'), 20);
  assert.equal(evalExpression('2×(3+(4−1))'), 12);
  assert.equal(evalExpression('10−4−3'), 3);
  assert.equal(evalExpression('100÷10÷2'), 5);
  assert.equal(evalExpression('-(2+3)'), -5);
  assert.equal(evalExpression('--5'), 5);
  assert.equal(evalExpression('-2×-3'), 6);
});

test('evalExpression reads every number form the calculator produces', () => {
  assert.equal(evalExpression('5.'), 5);
  assert.equal(evalExpression('.5'), 0.5);
  assert.equal(evalExpression('0.25'), 0.25);
  assert.equal(evalExpression('1.11111111111e-8+5'), 5.00000001111111111);
  assert.equal(evalExpression('-1e-8'), -1e-8);
  assert.ok(Number.isNaN(evalExpression('0÷0')));
});

test('evalExpression rejects empty, unfinished and unsafe input', () => {
  for (const expr of ['', '5+', '-', '-×3', 'alert(1)', 'this', '5;1',
    '(2+3', '2+3)', '()', '5 5', '1e+', '1..2', '2(3)', 'constructor', '1e3e3']) {
    assert.equal(evalExpression(expr), null, `expr = ${expr}`);
  }
});

test('basic arithmetic from button presses', () => {
  assert.equal(calc('12+30'), 42);
  assert.equal(calc('9−4'), 5);
  assert.equal(calc('6×7'), 42);
  assert.equal(calc('9÷4'), 2.25);
  assert.equal(formatNum(calc('.1+.2')), '0.3');
});

test('minus after an operator makes the next number negative', () => {
  assert.equal(type('5×−3'), '5×-3');
  assert.equal(calc('5×−3'), -15);
  assert.equal(calc('5−−3'), 8);
  assert.equal(calc('8÷−2+1'), -3);
  assert.equal(calc('5×−.5'), -2.5);
  assert.equal(calc('−7'), -7);
});

test('a dangling minus is replaced instead of getting stuck', () => {
  assert.equal(type('−×3'), '3');
  assert.equal(type('5×−+2'), '5+2');
  assert.equal(type('5×−−'), '5−');
});

test('a new operator replaces the trailing one', () => {
  assert.equal(type('5+×'), '5×');
  assert.equal(type('5−÷'), '5÷');
  assert.equal(type('×'), '');
});

test('leading zeros are replaced so the expression stays valid', () => {
  assert.equal(type('07'), '7');
  assert.equal(type('5+07'), '5+7');
  assert.equal(type('−07'), '-7');
  assert.equal(type('100'), '100');
});

test('decimal points', () => {
  assert.equal(type('.'), '0.');
  assert.equal(type('5+.'), '5+0.');
  assert.equal(type('5×−.'), '5×-0.');
  assert.equal(type('1.2.3'), '1.23');
  assert.equal(type('1.2+3.4'), '1.2+3.4');
});

test('percent after + or − takes that percent of what comes before', () => {
  assert.equal(withPercent('50+10'), '50+5');
  assert.equal(evalExpression(withPercent('50+10')), 55);
  assert.equal(withPercent('50−10'), '50−5');
  assert.equal(withPercent('2×3+10'), '2×3+0.6');
  assert.equal(withPercent('50+-10'), '50+-5');
});

test('percent elsewhere divides the last number by 100', () => {
  assert.equal(withPercent('10'), '0.1');
  assert.equal(withPercent('50×10'), '50×0.1');
  assert.equal(withPercent('50÷25'), '50÷0.25');
  assert.equal(withPercent('-10'), '-0.1');
  assert.equal(withPercent('5×-3'), '5×-0.03');
});

test('percent leaves unfinished input alone', () => {
  for (const expr of ['', '50+', '5×-', '5÷0+10']) {
    assert.equal(withPercent(expr), expr, `expr = ${expr}`);
  }
});

test('digits and decimal points are ignored after a result like 1e-8', () => {
  assert.equal(withDigit('1e-8', '5'), '1e-8');
  assert.equal(withDigit('-1e-8', '5'), '-1e-8');
  assert.equal(withDecimal('1e+21'), '1e+21');
  assert.equal(withDigit('1e+21+', '5'), '1e+21+5');
  assert.equal(withDigit('2+1e+21', '5'), '2+1e+21');
});

test('toFraction recovers simple fractions from floating-point results', () => {
  assert.deepEqual(toFraction(0.75), [3, 4]);
  assert.deepEqual(toFraction(1 / 3), [1, 3]);
  assert.deepEqual(toFraction(2 / 7), [2, 7]);
  assert.deepEqual(toFraction(0.1 + 0.2), [3, 10]);
  assert.deepEqual(toFraction(0.001), [1, 1000]);
  assert.equal(toFraction(Math.PI - 3), null);
});

test('unitFractions splits a fraction greedily into distinct unit fractions', () => {
  assert.deepEqual(unitFractions(3, 4), [2, 4]);
  assert.deepEqual(unitFractions(2, 3), [2, 6]);
  assert.deepEqual(unitFractions(1, 7), [7]);
  assert.deepEqual(unitFractions(4, 13), [4, 18, 468]);
  // Every split adds back up to the original fraction
  for (const [num, den] of [[3, 4], [2, 7], [5, 6], [7, 15], [4, 13]]) {
    const sum = unitFractions(num, den).reduce((s, d) => s + 1 / d, 0);
    assert.ok(Math.abs(sum - num / den) < 1e-12, `${num}/${den}`);
  }
});

test('unitFractions gives up on splits that are too long or too large', () => {
  assert.equal(unitFractions(5, 121), null);      // greedy needs a huge denominator
  assert.equal(unitFractions(999, 1000), null);   // needs more than five terms
});

test('fraction mode writes the fractional part as unit fractions', () => {
  const opts = { fractions: true };
  assert.deepEqual(describeHieroglyph(0.5, opts), { glyphs: '𓂋𓏺𓏺', note: '1/2' });
  assert.deepEqual(describeHieroglyph(0.6, opts), { glyphs: '𓂋𓏺𓏺 𓂋𓎆', note: '1/2 + 1/10' });
  assert.deepEqual(describeHieroglyph(1234.5, opts),
    { glyphs: '𓆼𓍢𓍢𓎆𓎆𓎆𓏺𓏺𓏺𓏺 𓂋𓏺𓏺', note: '1234 + 1/2' });
  assert.deepEqual(describeHieroglyph(-2.5, opts), { glyphs: '𓏺𓏺 𓂋𓏺𓏺', note: 'negative · 2 + 1/2' });
  assert.deepEqual(describeHieroglyph(0.001, opts), { glyphs: '𓂋𓆼', note: '1/1000' });
  // Whole numbers are unchanged
  assert.deepEqual(describeHieroglyph(5, opts), describeHieroglyph(5));
});

test('fraction mode uses the 2/3 sign for fractions of 2/3 and above', () => {
  const opts = { fractions: true };
  assert.deepEqual(describeHieroglyph(2 / 3, opts), { glyphs: '𓂌', note: '2/3' });
  assert.deepEqual(describeHieroglyph(5 / 6, opts), { glyphs: '𓂌 𓂋𓏺𓏺𓏺𓏺𓏺𓏺', note: '2/3 + 1/6' });
  assert.deepEqual(describeHieroglyph(0.75, opts), { glyphs: '𓂌 𓂋𓎆𓏺𓏺', note: '2/3 + 1/12' });
  assert.deepEqual(describeHieroglyph(1234.75, opts),
    { glyphs: '𓆼𓍢𓍢𓎆𓎆𓎆𓏺𓏺𓏺𓏺 𓂌 𓂋𓎆𓏺𓏺', note: '1234 + 2/3 + 1/12' });
  assert.deepEqual(describeHieroglyph(-1 - 2 / 3, opts), { glyphs: '𓏺 𓂌', note: 'negative · 1 + 2/3' });
  // Just under 2/3 still uses unit fractions only
  assert.deepEqual(describeHieroglyph(0.65, opts), { glyphs: '𓂋𓏺𓏺 𓂋𓏺𓏺𓏺𓏺𓏺𓏺𓏺 𓂋𓍢𓎆𓎆𓎆𓎆', note: '1/2 + 1/7 + 1/140' });
});

test('fraction mode falls back to rounding when no simple fraction fits', () => {
  const opts = { fractions: true };
  assert.deepEqual(describeHieroglyph(Math.PI, opts), { glyphs: '𓏺𓏺𓏺', note: '≈ rounded (no simple fraction)' });
  assert.deepEqual(describeHieroglyph(5 / 121, opts), { glyphs: '', note: 'rounds to 0 (no simple fraction)' });
  assert.deepEqual(describeHieroglyph(12000000.5, opts), { glyphs: '', note: 'too large for hieroglyphs' });
});
