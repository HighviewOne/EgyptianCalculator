/* ── State ── */
let expression = '';
let justCalculated = false;

const exprEl   = document.getElementById('expression');
const resultEl = document.getElementById('result');
const hierEl   = document.getElementById('hieroglyph-num');
const noteEl   = document.getElementById('hieroglyph-note');

function showHieroglyph(n) {
  const { glyphs, note } = n === null ? { glyphs: '', note: '' } : describeHieroglyph(n);
  hierEl.textContent = glyphs;
  noteEl.textContent = note;
}

function updateDisplay() {
  exprEl.textContent = expression || '0';

  // Live preview while typing
  const preview = evalExpression(expression);
  if (preview !== null && expression !== String(preview)) {
    resultEl.textContent = '= ' + formatNum(preview);
    showHieroglyph(preview);
  } else {
    resultEl.textContent = '';
    const solo = parseFloat(expression);
    showHieroglyph(Number.isFinite(solo) ? solo : null);
  }
}

/* ── Input handlers ── */
function appendNum(digit) {
  if (justCalculated) {
    expression = '';
    justCalculated = false;
  }
  expression = withDigit(expression, digit);
  updateDisplay();
}

function appendOp(op) {
  justCalculated = false;
  expression = withOp(expression, op);
  updateDisplay();
}

function appendDecimal() {
  if (justCalculated) { expression = ''; justCalculated = false; }
  expression = withDecimal(expression);
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
  expression = withPercent(expression);
  justCalculated = false;
  updateDisplay();
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
    showHieroglyph(null);
    justCalculated = true;
    return;
  }

  const formatted = formatNum(result);
  expression = formatted;
  resultEl.textContent = '';
  exprEl.textContent = formatted;
  showHieroglyph(result);
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

/* ── Initial render ── */
updateDisplay();
