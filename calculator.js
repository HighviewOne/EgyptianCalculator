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

/* ── State ── */
let expression = '';
let justCalculated = false;

const exprEl   = document.getElementById('expression');
const resultEl = document.getElementById('result');
const hierEl   = document.getElementById('hieroglyph-num');

function updateDisplay() {
  exprEl.textContent = expression || '0';

  // Live preview while typing
  const preview = evalExpression(expression);
  if (preview !== null && expression !== String(preview)) {
    resultEl.textContent = '= ' + formatNum(preview);
    hierEl.textContent = toEgyptian(Math.abs(Math.round(preview)));
  } else {
    resultEl.textContent = '';
    const solo = parseFloat(expression);
    hierEl.textContent = Number.isFinite(solo) ? toEgyptian(Math.abs(Math.round(solo))) : '';
  }
}

function formatNum(n) {
  if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : n < 0 ? '-Infinity' : 'NaN';
  // Trim floating point noise
  return parseFloat(n.toPrecision(12)).toString();
}

function evalExpression(expr) {
  if (!expr) return null;
  try {
    const normalized = expr
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/−/g, '-');
    // Safety: only allow digits, operators, dots, parens, spaces, and the
    // exponent 'e' that formatNum emits for very large/small results
    if (/[^0-9+\-*/.() e]/.test(normalized)) return null;
    const result = Function('"use strict"; return (' + normalized + ')')();
    return typeof result === 'number' ? result : null;
  } catch {
    return null;
  }
}

/* ── Input handlers ── */
function appendNum(digit) {
  if (justCalculated) {
    expression = '';
    justCalculated = false;
  }
  // Replace a lone leading zero — strict mode rejects literals like "05"
  const current = expression.split(/[÷×−+]/).pop();
  if (current === '0' || current === '-0') expression = expression.slice(0, -1);
  expression += digit;
  updateDisplay();
}

function appendOp(op) {
  justCalculated = false;
  if (!expression) {
    if (op === '−') expression = '-';
    return updateDisplay();
  }
  // Replace trailing operator
  const last = expression.slice(-1);
  if ('÷×−+'.includes(last)) {
    expression = expression.slice(0, -1) + op;
  } else {
    expression += op;
  }
  updateDisplay();
}

function appendDecimal() {
  if (justCalculated) { expression = '0'; justCalculated = false; }
  if (!expression) { expression = '0'; }
  // Only add dot if the current number segment doesn't already have one
  const parts = expression.split(/[÷×−+]/);
  const last = parts[parts.length - 1];
  if (!last.includes('.')) expression += '.';
  updateDisplay();
}

function clearAll() {
  expression = '';
  justCalculated = false;
  updateDisplay();
}

function toggleSign() {
  if (!expression) return;
  const val = evalExpression(expression);
  if (val !== null) {
    expression = formatNum(-val);
    justCalculated = false;
    updateDisplay();
  }
}

function percent() {
  if (!expression) return;
  const val = evalExpression(expression);
  if (val !== null) {
    expression = formatNum(val / 100);
    justCalculated = false;
    updateDisplay();
  }
}

function calculate() {
  if (!expression) return;
  const result = evalExpression(expression);
  if (result === null) return;

  // Infinity/NaN can't be computed on further — show it, then start fresh
  if (!Number.isFinite(result)) {
    expression = '';
    resultEl.textContent = '';
    exprEl.textContent = formatNum(result);
    hierEl.textContent = '';
    justCalculated = true;
    return;
  }

  const formatted = formatNum(result);
  expression = formatted;
  resultEl.textContent = '';
  exprEl.textContent = formatted;
  hierEl.textContent = toEgyptian(Math.abs(Math.round(result)));
  justCalculated = true;

  // Gold flash on equals
  exprEl.classList.add('flash');
  setTimeout(() => exprEl.classList.remove('flash'), 300);
}

/* ── Keyboard support ── */
document.addEventListener('keydown', e => {
  // Leave browser shortcuts (Ctrl +/- zoom, etc.) alone
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key >= '0' && e.key <= '9') appendNum(e.key);
  else if (e.key === '.') appendDecimal();
  else if (e.key === '+') appendOp('+');
  else if (e.key === '-') appendOp('−');
  else if (e.key === '*') appendOp('×');
  else if (e.key === '/') appendOp('÷');
  else if (e.key === 'Enter' || e.key === '=') calculate();
  else if (e.key === 'Backspace') {
    expression = expression.slice(0, -1);
    justCalculated = false;
    updateDisplay();
  }
  else if (e.key === 'Escape') clearAll();
  else if (e.key === '%') percent();
  else return;
  // Handled: stop Enter from also clicking the last-focused button,
  // and '/' from opening Firefox quick find
  e.preventDefault();
});

/* ── Starfield ── */
(function buildStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random() * 100}%`, `top:${Math.random() * 100}%`,
      `--dur:${(Math.random() * 4 + 2).toFixed(1)}s`,
      `--delay:-${(Math.random() * 6).toFixed(1)}s`,
    ].join(';');
    container.appendChild(star);
  }
})();

/* ── Flash keyframe (injected) ── */
const style = document.createElement('style');
style.textContent = `
  .flash { animation: gold-flash 0.3s ease-out; }
  @keyframes gold-flash {
    0%   { color: #f0c040; text-shadow: 0 0 30px #f0c040; }
    100% { color: #a8d060; text-shadow: none; }
  }
`;
document.head.appendChild(style);

/* ── Initial render ── */
updateDisplay();
