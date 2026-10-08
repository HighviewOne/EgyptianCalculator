/* Calculator logic with no DOM access, shared by calculator.js and the tests.
   Loaded as a classic script (ES modules don't load over file://), so the
   functions below are globals in the browser and module exports in Node. */

/* ── Egyptian numeral conversion ── */
const EGYPTIAN_GLYPHS = [
  { value: 1000000, glyph: '𓁨' }, // Astonished man
  { value: 100000,  glyph: '𓆐' }, // Tadpole
  { value: 10000,   glyph: '𓂭' }, // Pointing finger
  { value: 1000,    glyph: '𓆼' }, // Lotus
  { value: 100,     glyph: '𓍢' }, // Coiled rope
  { value: 10,      glyph: '𓎆' }, // Hobble
  { value: 1,       glyph: '𓏺' }, // Stroke
];

function toEgyptian(n) {
  if (!Number.isFinite(n) || n <= 0 || n > 9999999 || !Number.isInteger(n)) return '';
  let result = '';
  let remaining = n;
  for (const { value, glyph } of EGYPTIAN_GLYPHS) {
    const count = Math.floor(remaining / value);
    result += glyph.repeat(count);
    remaining -= count * value;
  }
  return result;
}

// Glyphs plus a short caveat when they can't show the number exactly:
// the Egyptian system has no zero, no negatives, no decimals, and tops out
// below ten million.
function describeHieroglyph(n) {
  if (!Number.isFinite(n)) return { glyphs: '', note: '' };
  const rounded = Math.round(Math.abs(n));
  if (rounded > 9999999) return { glyphs: '', note: 'too large for hieroglyphs' };
  if (rounded === 0) {
    return { glyphs: '', note: n === 0 ? 'no hieroglyph for zero' : 'rounds to 0 — no hieroglyph for zero' };
  }
  const notes = [];
  if (n < 0) notes.push('negative');
  if (!Number.isInteger(n)) notes.push('≈ rounded');
  return { glyphs: toEgyptian(rounded), note: notes.join(' · ') };
}

function formatNum(n) {
  if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : n < 0 ? '-Infinity' : 'NaN';
  // Trim floating point noise
  return parseFloat(n.toPrecision(12)).toString();
}

// Numbers (including the 1e+21 / 1.5e-8 forms formatNum emits), operators
// and parentheses. Returns null if anything else appears.
function tokenize(src) {
  const pattern = /((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)|([-+*/()])/y;
  const tokens = [];
  while (pattern.lastIndex < src.length) {
    const match = pattern.exec(src);
    if (!match) return null;
    tokens.push(match[1] !== undefined ? Number(match[1]) : match[2]);
  }
  return tokens;
}

// Recursive-descent evaluator, so typed input is never run as code:
//   sum     = product (('+' | '-') product)*
//   product = unary (('*' | '/') unary)*
//   unary   = '-' unary | primary
//   primary = number | '(' sum ')'
// Returns null for empty or unfinished input like "5+" or "(2".
function evalExpression(expr) {
  if (!expr) return null;
  const tokens = tokenize(expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-'));
  if (!tokens) return null;
  let pos = 0;

  function sum() {
    let value = product();
    while (tokens[pos] === '+' || tokens[pos] === '-') {
      const op = tokens[pos++];
      const rhs = product();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }
  function product() {
    let value = unary();
    while (tokens[pos] === '*' || tokens[pos] === '/') {
      const op = tokens[pos++];
      const rhs = unary();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }
  function unary() {
    if (tokens[pos] === '-') { pos++; return -unary(); }
    return primary();
  }
  function primary() {
    const token = tokens[pos++];
    if (typeof token === 'number') return token;
    if (token === '(') {
      const value = sum();
      if (tokens[pos++] === ')') return value;
    }
    throw new SyntaxError('Unexpected ' + (token ?? 'end of input'));
  }

  try {
    const value = sum();
    return pos === tokens.length ? value : null;
  } catch {
    return null;
  }
}

/* ── Input editing: each takes the expression and returns the new one ── */
const OPS = '÷×−+';

// The number at the end of the expression, sign and exponent included
// ("-3" in "5×-3", "1e+21" in "2+1e+21"), or '' if it ends in an operator
function lastNumber(expr) {
  const match = expr.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/);
  return match ? match[0] : '';
}

function withDigit(expr, digit) {
  // A result like 1e-8 is complete; more digits would land in the exponent
  if (lastNumber(expr).includes('e')) return expr;
  // Replace a lone leading zero so "0" then "7" reads 7, not 07
  const current = expr.split(/[÷×−+]/).pop();
  if (current === '0' || current === '-0') expr = expr.slice(0, -1);
  return expr + digit;
}

function withOp(expr, op) {
  // Minus at the start or straight after an operator negates the next number
  if (op === '−' && (!expr || OPS.includes(expr.slice(-1)))) return expr + '-';
  // Drop a dangling negative sign and/or trailing operator, then add the new one
  expr = expr.replace(/[÷×−+]?-$/, '').replace(/[÷×−+]$/, '');
  return expr ? expr + op : expr;
}

function withDecimal(expr) {
  if (lastNumber(expr).includes('e')) return expr;
  // Only add dot if the current number segment doesn't already have one
  const last = expr.split(/[÷×−+]/).pop();
  if (last === '' || last === '-') expr += '0';
  return last.includes('.') ? expr : expr + '.';
}

// Works like a phone calculator: after + or − it takes that percent of
// everything before it (50+10% → 50+5); otherwise it divides the last
// number by 100 (50×10% → 50×0.1, 10% → 0.1)
function withPercent(expr) {
  const num = lastNumber(expr);
  if (!num) return expr;
  const head = expr.slice(0, -num.length);
  let value = Number(num) / 100;
  if (head.endsWith('+') || head.endsWith('−')) {
    const base = evalExpression(head.slice(0, -1));
    if (base === null) return expr;
    value *= base;
  }
  return Number.isFinite(value) ? head + formatNum(value) : expr;
}

if (typeof module !== 'undefined') {
  module.exports = {
    toEgyptian, describeHieroglyph, formatNum, evalExpression,
    withDigit, withOp, withDecimal, withPercent,
  };
}
