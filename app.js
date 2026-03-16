// Theme
const btnTheme = document.getElementById('btn-theme');

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Init: use saved preference or follow system
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme || getSystemTheme());

// Follow system changes when no manual preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

btnTheme.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

// Auto-resize textareas
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.8) + 'px';
}

document.querySelectorAll('textarea').forEach(ta => {
  ta.addEventListener('input', () => autoResize(ta));
  // Also handle paste (fires before input sometimes)
  ta.addEventListener('paste', () => requestAnimationFrame(() => autoResize(ta)));
});

// Tab switching
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabName) {
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(tc => tc.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
  location.hash = tabName;
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Restore tab from URL hash
const hash = location.hash.slice(1);
if (hash && document.getElementById(`tab-${hash}`)) {
  switchTab(hash);
}

const textLeft = document.getElementById('text-left');
const textRight = document.getElementById('text-right');
const btnDiff = document.getElementById('btn-diff');
const btnSwap = document.getElementById('btn-swap');
const btnClear = document.getElementById('btn-clear');
const chkInline = document.getElementById('chk-inline');
const chkIgnoreWS = document.getElementById('chk-ignore-whitespace');
const resultArea = document.getElementById('result-area');
const diffOutput = document.getElementById('diff-output');
const resultStats = document.getElementById('result-stats');
const countLeft = document.getElementById('count-left');
const countRight = document.getElementById('count-right');

// Character counts
textLeft.addEventListener('input', () => {
  countLeft.textContent = `${textLeft.value.length} chars`;
});
textRight.addEventListener('input', () => {
  countRight.textContent = `${textRight.value.length} chars`;
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    runDiff();
  }
});

btnDiff.addEventListener('click', runDiff);

btnSwap.addEventListener('click', () => {
  const tmp = textLeft.value;
  textLeft.value = textRight.value;
  textRight.value = tmp;
  textLeft.dispatchEvent(new Event('input'));
  textRight.dispatchEvent(new Event('input'));
});

btnClear.addEventListener('click', () => {
  textLeft.value = '';
  textRight.value = '';
  resultArea.classList.add('hidden');
  diffOutput.innerHTML = '';
  textLeft.dispatchEvent(new Event('input'));
  textRight.dispatchEvent(new Event('input'));
});

chkInline.addEventListener('change', () => {
  if (!resultArea.classList.contains('hidden')) runDiff();
});
chkIgnoreWS.addEventListener('change', () => {
  if (!resultArea.classList.contains('hidden')) runDiff();
});

function normalizeLines(text, ignoreWS) {
  let lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  // Remove trailing empty line if text ends with newline
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function compareLines(a, b, ignoreWS) {
  if (ignoreWS) {
    return a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
  }
  return a === b;
}

function runDiff() {
  const ignoreWS = chkIgnoreWS.checked;
  const inline = chkInline.checked;

  const oldLines = normalizeLines(textLeft.value);
  const newLines = normalizeLines(textRight.value);

  // For comparison, optionally normalize whitespace
  let cmpOld = oldLines;
  let cmpNew = newLines;
  if (ignoreWS) {
    cmpOld = oldLines.map(l => l.replace(/\s+/g, ' ').trim());
    cmpNew = newLines.map(l => l.replace(/\s+/g, ' ').trim());
  }

  const edits = diffLines(cmpOld, cmpNew);

  let added = 0, removed = 0, unchanged = 0;
  for (const e of edits) {
    if (e.type === 'insert') added++;
    else if (e.type === 'delete') removed++;
    else unchanged++;
  }

  resultStats.innerHTML = `
    <span class="stat-added">+${added} added</span>
    <span class="stat-removed">-${removed} removed</span>
    <span class="stat-unchanged">${unchanged} unchanged</span>
  `;

  if (added === 0 && removed === 0) {
    diffOutput.innerHTML = '<div style="padding:24px;text-align:center;color:#4caf50;font-size:16px;">No differences found</div>';
    resultArea.classList.remove('hidden');
    return;
  }

  if (inline) {
    renderInline(edits, oldLines, newLines);
  } else {
    renderSideBySide(edits, oldLines, newLines);
  }

  resultArea.classList.remove('hidden');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSideBySide(edits, oldLines, newLines) {
  // Group edits into chunks for side-by-side alignment
  const rows = [];
  let i = 0;

  while (i < edits.length) {
    const edit = edits[i];

    if (edit.type === 'equal') {
      rows.push({
        type: 'equal',
        oldNum: edit.oldIndex + 1,
        newNum: edit.newIndex + 1,
        oldText: oldLines[edit.oldIndex],
        newText: newLines[edit.newIndex]
      });
      i++;
    } else {
      // Collect consecutive deletes and inserts
      const deletes = [];
      const inserts = [];
      while (i < edits.length && edits[i].type === 'delete') {
        deletes.push(edits[i]);
        i++;
      }
      while (i < edits.length && edits[i].type === 'insert') {
        inserts.push(edits[i]);
        i++;
      }

      const maxLen = Math.max(deletes.length, inserts.length);
      for (let j = 0; j < maxLen; j++) {
        const del = deletes[j];
        const ins = inserts[j];

        if (del && ins) {
          // Changed line - do char diff
          const charDiff = diffChars(oldLines[del.oldIndex], newLines[ins.newIndex]);
          rows.push({
            type: 'changed',
            oldNum: del.oldIndex + 1,
            newNum: ins.newIndex + 1,
            oldHtml: charDiff.old,
            newHtml: charDiff.new
          });
        } else if (del) {
          rows.push({
            type: 'deleted',
            oldNum: del.oldIndex + 1,
            oldText: oldLines[del.oldIndex]
          });
        } else if (ins) {
          rows.push({
            type: 'inserted',
            newNum: ins.newIndex + 1,
            newText: newLines[ins.newIndex]
          });
        }
      }
    }
  }

  let html = '<table class="diff-table"><tbody>';

  for (const row of rows) {
    if (row.type === 'equal') {
      html += `<tr>
        <td class="line-num">${row.oldNum}</td>
        <td class="line-content">${escapeHtml(row.oldText)}</td>
        <td class="gutter"></td>
        <td class="line-num">${row.newNum}</td>
        <td class="line-content">${escapeHtml(row.newText)}</td>
      </tr>`;
    } else if (row.type === 'changed') {
      html += `<tr>
        <td class="line-num diff-removed">${row.oldNum}</td>
        <td class="line-content diff-removed">${row.oldHtml}</td>
        <td class="gutter"></td>
        <td class="line-num diff-added">${row.newNum}</td>
        <td class="line-content diff-added">${row.newHtml}</td>
      </tr>`;
    } else if (row.type === 'deleted') {
      html += `<tr>
        <td class="line-num diff-removed">${row.oldNum}</td>
        <td class="line-content diff-removed">${escapeHtml(row.oldText)}</td>
        <td class="gutter"></td>
        <td class="line-num diff-empty"></td>
        <td class="line-content diff-empty">&nbsp;</td>
      </tr>`;
    } else if (row.type === 'inserted') {
      html += `<tr>
        <td class="line-num diff-empty"></td>
        <td class="line-content diff-empty">&nbsp;</td>
        <td class="gutter"></td>
        <td class="line-num diff-added">${row.newNum}</td>
        <td class="line-content diff-added">${escapeHtml(row.newText)}</td>
      </tr>`;
    }
  }

  html += '</tbody></table>';
  diffOutput.innerHTML = html;
  diffOutput.classList.remove('inline-diff');
}

function renderInline(edits, oldLines, newLines) {
  // Inline: single column, show modified text with changed chars highlighted in red
  let i = 0;
  const segments = []; // collect line HTML segments

  while (i < edits.length) {
    const edit = edits[i];

    if (edit.type === 'equal') {
      // Unchanged line: show as-is
      segments.push(escapeHtml(newLines[edit.newIndex]));
      i++;
    } else {
      // Group consecutive deletes and inserts
      const deletes = [];
      const inserts = [];
      while (i < edits.length && edits[i].type === 'delete') {
        deletes.push(edits[i]);
        i++;
      }
      while (i < edits.length && edits[i].type === 'insert') {
        inserts.push(edits[i]);
        i++;
      }

      const maxLen = Math.max(deletes.length, inserts.length);
      for (let j = 0; j < maxLen; j++) {
        const del = deletes[j];
        const ins = inserts[j];

        if (del && ins) {
          // Paired: show new line with changed chars marked
          const charDiff = diffChars(oldLines[del.oldIndex], newLines[ins.newIndex]);
          segments.push(charDiff.new);
        } else if (del) {
          // Pure deletion: show with strikethrough
          segments.push(`<span class="inline-deleted">${escapeHtml(oldLines[del.oldIndex])}</span>`);
        } else if (ins) {
          // Pure insertion: highlight whole line
          segments.push(`<span class="char-added">${escapeHtml(newLines[ins.newIndex])}</span>`);
        }
      }
    }
  }

  const html = `<pre class="inline-result">${segments.join('\n')}</pre>`;
  diffOutput.innerHTML = html;
  diffOutput.classList.add('inline-diff');
}
