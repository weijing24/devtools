// JSON Formatter
const jsonInput = document.getElementById('json-input');
const jsonOutputCode = document.getElementById('json-output-code');
const jsonError = document.getElementById('json-error');
const btnFormat = document.getElementById('btn-format');
const btnMinify = document.getElementById('btn-minify');
const btnCopyJson = document.getElementById('btn-copy-json');
const btnClearJson = document.getElementById('btn-clear-json');
const selIndent = document.getElementById('sel-indent');
const countJsonIn = document.getElementById('count-json-in');
const countJsonOut = document.getElementById('count-json-out');

jsonInput.addEventListener('input', () => {
  countJsonIn.textContent = `${jsonInput.value.length} chars`;
});

btnFormat.addEventListener('click', formatJson);
btnMinify.addEventListener('click', minifyJson);

btnCopyJson.addEventListener('click', () => {
  const text = jsonOutputCode.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
});

btnClearJson.addEventListener('click', () => {
  jsonInput.value = '';
  jsonOutputCode.innerHTML = '';
  jsonError.classList.add('hidden');
  countJsonIn.textContent = '0 chars';
  countJsonOut.textContent = '0 chars';
});

function formatJson() {
  const raw = jsonInput.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const indent = selIndent.value === 'tab' ? '\t' : Number(selIndent.value);
    const formatted = JSON.stringify(parsed, null, indent);
    jsonOutputCode.innerHTML = syntaxHighlightJson(escapeHtml(formatted));
    countJsonOut.textContent = `${formatted.length} chars`;
    jsonError.classList.add('hidden');
  } catch (e) {
    showJsonError(e.message);
  }
}

function minifyJson() {
  const raw = jsonInput.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const minified = JSON.stringify(parsed);
    jsonOutputCode.innerHTML = syntaxHighlightJson(escapeHtml(minified));
    countJsonOut.textContent = `${minified.length} chars`;
    jsonError.classList.add('hidden');
  } catch (e) {
    showJsonError(e.message);
  }
}

function showJsonError(msg) {
  jsonError.textContent = 'Error: ' + msg;
  jsonError.classList.remove('hidden');
  jsonOutputCode.innerHTML = '';
  countJsonOut.textContent = '0 chars';
}

// Syntax highlight already-escaped JSON string
function syntaxHighlightJson(html) {
  // Keys (quoted strings followed by colon)
  html = html.replace(/(&quot;[^&]*?&quot;)\s*:/g, '<span class="json-key">$1</span>:');
  // String values (quoted strings not followed by colon)
  html = html.replace(/:(\s*)(&quot;[^&]*?&quot;)/g, ':<span class="json-string">$1$2</span>');
  // Remaining standalone strings (in arrays)
  html = html.replace(/(?<=[\[,\n])\s*(&quot;[^&]*?&quot;)(?=\s*[,\]\n])/g, '<span class="json-string">$1</span>');
  // Numbers
  html = html.replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>');
  // Booleans
  html = html.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>');
  // Null
  html = html.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
  return html;
}

// Toast helper (shared)
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('hidden'), 1500);
}
