// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toEgyptian, describeHieroglyph, formatNum, evalExpression,
  withDigit, withOp, withDecimal,
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

test('evalExpression rejects empty, unfinished and unsafe input', () => {
  for (const expr of ['', '5+', '-', '-×3', 'alert(1)', 'this', '5;1']) {
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
