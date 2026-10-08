/* ── State ── */
let expression = '';
let justCalculated = false;

const exprEl   = document.getElementById('expression');
const resultEl = document.getElementById('result');
const hierEl   = document.getElementById('hieroglyph-num');
const noteEl   = document.getElementById('hieroglyph-note');
const infoEl   = document.getElementById('glyph-info');
const displayEl = document.getElementById('display');

const fractionToggle = document.getElementById('fraction-toggle');

// Unit-fraction mode, remembered per browser when storage is available
let showFractions = false;
try { showFractions = localStorage.getItem('unitFractions') === 'on'; } catch {}
fractionToggle.setAttribute('aria-pressed', showFractions);

let hieroglyphValue = null;

function showHieroglyph(n) {
  hieroglyphValue = n;
  const { glyphs, note } = n === null
    ? { glyphs: '', note: '' }
    : describeHieroglyph(n, { fractions: showFractions });
  renderGlyphs(glyphs);
  noteEl.textContent = note;
}

/* ── Glyph explanations ── */
let activeGlyph = null;

// One span per labelled piece; the line becomes a single Tab stop whose
// spoken name reads the whole number out
function renderGlyphs(glyphs) {
  const { parts, reading } = readGlyphs(glyphs);
  hierEl.replaceChildren(...parts.map(({ text, label }) => {
    if (!label) return document.createTextNode(text);
    const span = document.createElement('span');
    span.className = 'glyph';
    span.textContent = text;
    span.dataset.label = label;
    return span;
  }));
  if (reading) {
    hierEl.tabIndex = 0;
    hierEl.setAttribute('role', 'img');
    hierEl.setAttribute('aria-label', reading);
  } else {
    hierEl.removeAttribute('tabindex');
    hierEl.removeAttribute('role');
    hierEl.removeAttribute('aria-label');
  }
  // Keep a keyboard user's reading up to date as they type
  explain(reading && hierEl.matches(':focus-visible') ? reading : '');
}

// Shows text in place of the note, highlighting the glyph it describes
function explain(text, glyph = null) {
  activeGlyph?.classList.remove('active');
  activeGlyph = glyph;
  glyph?.classList.add('active');
  infoEl.textContent = text;
  displayEl.classList.toggle('explaining', Boolean(text));
}

const explainGlyph = glyph => explain(`${glyph.textContent} ${glyph.dataset.label}`, glyph);

// Mouse: follow the pointer. Touch: a tap shows the label until the next
// tap elsewhere (touch pointers "leave" as soon as the finger lifts).
hierEl.addEventListener('pointerover', e => {
  const glyph = e.target.closest('.glyph');
  if (glyph && e.pointerType === 'mouse') explainGlyph(glyph);
});
hierEl.addEventListener('pointerleave', e => {
  if (e.pointerType === 'mouse') explain('');
});
hierEl.addEventListener('click', e => {
  const glyph = e.target.closest('.glyph');
  if (glyph) explainGlyph(glyph);
});
document.addEventListener('click', e => {
  if (!hierEl.contains(e.target)) explain('');
});
// Keyboard focus shows the whole reading (a mouse click focuses too, but
// isn't :focus-visible)
hierEl.addEventListener('focus', () => {
  if (hierEl.matches(':focus-visible')) explain(hierEl.getAttribute('aria-label') || '');
});
hierEl.addEventListener('blur', () => explain(''));

function updateDisplay() {
  exprEl.textContent = expression || '0';

  // Live preview while typing, with any open brackets closed
  const preview = evalExpression(withClosedParens(expression));
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

function appendOpenParen() {
  if (justCalculated) { expression = ''; justCalculated = false; }
  expression = withOpenParen(expression);
  updateDisplay();
}

function appendCloseParen() {
  justCalculated = false;
  expression = withCloseParen(expression);
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  justCalculated = false;
  updateDisplay();
}

function toggleSign() {
  if (!expression) return;
  const val = evalExpression(withClosedParens(expression));
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
  const result = evalExpression(withClosedParens(expression));
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

  // Gold flash on equals; removing the class and forcing a reflow restarts
  // the animation when = is pressed again before it finishes
  exprEl.classList.remove('flash');
  void exprEl.offsetWidth;
  exprEl.classList.add('flash');
}

exprEl.addEventListener('animationend', () => exprEl.classList.remove('flash'));

function toggleFractions() {
  showFractions = !showFractions;
  fractionToggle.setAttribute('aria-pressed', showFractions);
  try { localStorage.setItem('unitFractions', showFractions ? 'on' : 'off'); } catch {}
  showHieroglyph(hieroglyphValue);
}

/* ── Buttons ── */
const ACTIONS = {
  clear: clearAll,
  sign: toggleSign,
  percent,
  decimal: appendDecimal,
  equals: calculate,
  open: appendOpenParen,
  close: appendCloseParen,
  backspace,
  fractions: toggleFractions,
};

document.querySelector('.calculator').addEventListener('click', e => {
  const button = e.target.closest('button');
  if (!button) return;
  const { digit, op, action } = button.dataset;
  if (digit) appendNum(digit);
  else if (op) appendOp(op);
  else if (action) ACTIONS[action]();
});

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
  else if (e.key === 'Backspace') backspace();
  else if (e.key === '(') appendOpenParen();
  else if (e.key === ')') appendCloseParen();
  else if (e.key === 'Escape' || e.key === 'Delete' || e.key === 'c' || e.key === 'C') clearAll();
  else if (e.key === '%') percent();
  else if (e.key === 'f' || e.key === 'F') toggleFractions();
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
