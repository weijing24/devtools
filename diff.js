// Myers diff algorithm implementation
function diffLines(oldLines, newLines) {
  const N = oldLines.length;
  const M = newLines.length;
  const MAX = N + M;
  const V = new Array(2 * MAX + 1);
  const trace = [];

  V[MAX + 1] = 0;

  for (let d = 0; d <= MAX; d++) {
    const newV = V.slice();
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && V[MAX + k - 1] < V[MAX + k + 1])) {
        x = V[MAX + k + 1];
      } else {
        x = V[MAX + k - 1] + 1;
      }
      let y = x - k;

      while (x < N && y < M && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }

      newV[MAX + k] = x;

      if (x >= N && y >= M) {
        trace.push(newV);
        return backtrack(trace, MAX, N, M);
      }
    }
    trace.push(newV);
    V.splice(0, V.length, ...newV);
  }
  return [];
}

function backtrack(trace, MAX, N, M) {
  const edits = [];
  let x = N;
  let y = M;

  for (let d = trace.length - 1; d >= 0; d--) {
    const V = trace[d];
    const k = x - y;

    let prevK;
    if (k === -d || (k !== d && V[MAX + k - 1] < V[MAX + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = V[MAX + prevK];
    const prevY = prevX - prevK;

    // Diagonal moves (equal lines)
    while (x > prevX && y > prevY) {
      x--;
      y--;
      edits.unshift({ type: 'equal', oldIndex: x, newIndex: y });
    }

    if (d > 0) {
      if (x === prevX) {
        // Insert
        y--;
        edits.unshift({ type: 'insert', newIndex: y });
      } else {
        // Delete
        x--;
        edits.unshift({ type: 'delete', oldIndex: x });
      }
    }
  }

  return edits;
}

// Character-level diff for highlighting within changed lines
function diffChars(oldStr, newStr) {
  const oldChars = Array.from(oldStr);
  const newChars = Array.from(newStr);

  if (oldChars.length === 0 && newChars.length === 0) return { old: oldStr, new: newStr };
  if (oldChars.length === 0) return { old: '', new: `<span class="char-added">${escapeHtml(newStr)}</span>` };
  if (newChars.length === 0) return { old: `<span class="char-removed">${escapeHtml(oldStr)}</span>`, new: '' };

  // For very long lines, use a word-level diff instead of char-level
  if (oldChars.length * newChars.length > 100000) {
    return diffWords(oldStr, newStr);
  }

  const edits = diffLines(oldChars, newChars);
  let oldHtml = '';
  let newHtml = '';
  let oldBuf = '', newBuf = '';
  let oldType = '', newType = '';

  function flushOld(type) {
    if (oldBuf) {
      if (oldType === 'removed') {
        oldHtml += `<span class="char-removed">${escapeHtml(oldBuf)}</span>`;
      } else {
        oldHtml += escapeHtml(oldBuf);
      }
      oldBuf = '';
    }
    oldType = type;
  }

  function flushNew(type) {
    if (newBuf) {
      if (newType === 'added') {
        newHtml += `<span class="char-added">${escapeHtml(newBuf)}</span>`;
      } else {
        newHtml += escapeHtml(newBuf);
      }
      newBuf = '';
    }
    newType = type;
  }

  for (const edit of edits) {
    if (edit.type === 'equal') {
      flushOld('equal');
      flushNew('equal');
      const ch = oldChars[edit.oldIndex];
      oldBuf += ch;
      newBuf += ch;
    } else if (edit.type === 'delete') {
      flushOld('removed');
      oldBuf += oldChars[edit.oldIndex];
    } else if (edit.type === 'insert') {
      flushNew('added');
      newBuf += newChars[edit.newIndex];
    }
  }
  flushOld('');
  flushNew('');

  return { old: oldHtml, new: newHtml };
}

// Word-level diff for long lines (e.g. JSON)
function diffWords(oldStr, newStr) {
  // Split into tokens: words, punctuation, whitespace
  const tokenize = s => s.match(/\s+|[{}[\]:,"]+|[^\s{}[\]:,"]+/g) || [];
  const oldTokens = tokenize(oldStr);
  const newTokens = tokenize(newStr);

  const edits = diffLines(oldTokens, newTokens);

  let oldHtml = '';
  let newHtml = '';
  let oldBuf = '', newBuf = '';
  let oldType = '', newType = '';

  function flushOld(type) {
    if (oldBuf) {
      oldHtml += oldType === 'removed'
        ? `<span class="char-removed">${escapeHtml(oldBuf)}</span>`
        : escapeHtml(oldBuf);
      oldBuf = '';
    }
    oldType = type;
  }

  function flushNew(type) {
    if (newBuf) {
      newHtml += newType === 'added'
        ? `<span class="char-added">${escapeHtml(newBuf)}</span>`
        : escapeHtml(newBuf);
      newBuf = '';
    }
    newType = type;
  }

  for (const edit of edits) {
    if (edit.type === 'equal') {
      flushOld('equal');
      flushNew('equal');
      oldBuf += oldTokens[edit.oldIndex];
      newBuf += newTokens[edit.newIndex];
    } else if (edit.type === 'delete') {
      flushOld('removed');
      oldBuf += oldTokens[edit.oldIndex];
    } else if (edit.type === 'insert') {
      flushNew('added');
      newBuf += newTokens[edit.newIndex];
    }
  }
  flushOld('');
  flushNew('');

  return { old: oldHtml, new: newHtml };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
