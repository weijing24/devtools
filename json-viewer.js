// JSON Viewer
const jvInput = document.getElementById('jv-input');
const jsonTree = document.getElementById('json-tree');
const jvError = document.getElementById('jv-error');
const jvSearch = document.getElementById('jv-search');
const jvPathDisplay = document.getElementById('jv-path-display');
const btnRender = document.getElementById('btn-render');
const btnExpandAll = document.getElementById('btn-expand-all');
const btnCollapseAll = document.getElementById('btn-collapse-all');
const btnClearViewer = document.getElementById('btn-clear-viewer');

btnRender.addEventListener('click', renderTree);
btnExpandAll.addEventListener('click', () => {
  jsonTree.querySelectorAll('.jv-node.collapsed').forEach(n => n.classList.remove('collapsed'));
});
btnCollapseAll.addEventListener('click', () => {
  jsonTree.querySelectorAll('.jv-node.jv-expandable').forEach(n => n.classList.add('collapsed'));
});
btnClearViewer.addEventListener('click', () => {
  jvInput.value = '';
  jsonTree.innerHTML = '';
  jvError.classList.add('hidden');
  jvPathDisplay.textContent = '';
});

let searchTimer;
jvSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => filterTree(jvSearch.value.trim().toLowerCase()), 200);
});

function renderTree() {
  const raw = jvInput.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    jsonTree.innerHTML = '';
    const root = buildNode(parsed, '$', null);
    jsonTree.appendChild(root);
    jvError.classList.add('hidden');
    jvSearch.value = '';
  } catch (e) {
    jvError.textContent = 'Error: ' + e.message;
    jvError.classList.remove('hidden');
    jsonTree.innerHTML = '';
  }
}

function buildNode(value, path, key) {
  const node = document.createElement('div');
  node.className = 'jv-node';
  node.dataset.path = path;

  const type = getType(value);

  if (type === 'object' || type === 'array') {
    node.classList.add('jv-expandable');

    const toggle = document.createElement('span');
    toggle.className = 'jv-toggle';
    toggle.textContent = '\u25BE'; // ▾
    node.appendChild(toggle);

    if (key !== null) {
      const keyEl = createKeyEl(key);
      node.appendChild(keyEl);
      node.appendChild(document.createTextNode(': '));
    }

    const bracket = type === 'array' ? ['[', ']'] : ['{', '}'];
    node.appendChild(document.createTextNode(bracket[0]));

    // Summary (shown when collapsed)
    const summary = document.createElement('span');
    summary.className = 'jv-summary';
    const entries = type === 'array' ? value.length : Object.keys(value).length;
    const unit = type === 'array' ? (entries === 1 ? 'item' : 'items') : (entries === 1 ? 'key' : 'keys');
    summary.textContent = ` ${entries} ${unit} `;
    node.appendChild(summary);

    // Children container
    const children = document.createElement('div');
    children.className = 'jv-children';

    if (type === 'array') {
      value.forEach((item, i) => {
        const childPath = `${path}[${i}]`;
        children.appendChild(buildNode(item, childPath, i));
      });
    } else {
      Object.keys(value).forEach(k => {
        const childPath = isSimpleKey(k) ? `${path}.${k}` : `${path}["${k}"]`;
        children.appendChild(buildNode(value[k], childPath, k));
      });
    }

    node.appendChild(children);

    // Closing bracket
    const closeLine = document.createElement('div');
    closeLine.className = 'jv-close';
    closeLine.textContent = bracket[1];
    node.appendChild(closeLine);

    // Toggle click
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      node.classList.toggle('collapsed');
    });
    summary.addEventListener('click', (e) => {
      e.stopPropagation();
      node.classList.toggle('collapsed');
    });
  } else {
    // Leaf node
    const spacer = document.createElement('span');
    spacer.className = 'jv-leaf-spacer';
    node.appendChild(spacer);

    if (key !== null) {
      const keyEl = createKeyEl(key);
      node.appendChild(keyEl);
      node.appendChild(document.createTextNode(': '));
    }

    const valEl = document.createElement('span');
    valEl.className = `json-${type}`;
    valEl.textContent = type === 'string' ? `"${value}"` : String(value);
    node.appendChild(valEl);
  }

  // Click to copy path
  node.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = node.dataset.path;
    jvPathDisplay.textContent = p;
    navigator.clipboard.writeText(p).then(() => showToast('Path copied: ' + p));
  });

  return node;
}

function createKeyEl(key) {
  const el = document.createElement('span');
  el.className = 'json-key';
  el.textContent = typeof key === 'number' ? key : `"${key}"`;
  return el;
}

function isSimpleKey(k) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k);
}

function getType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val; // 'object', 'string', 'number', 'boolean'
}

// Search / filter
function filterTree(query) {
  const allNodes = jsonTree.querySelectorAll('.jv-node');

  if (!query) {
    // Reset: show all, remove highlights
    allNodes.forEach(n => {
      n.classList.remove('jv-hidden', 'jv-match');
    });
    removeHighlights();
    return;
  }

  removeHighlights();

  // First hide all
  allNodes.forEach(n => {
    n.classList.add('jv-hidden');
    n.classList.remove('jv-match');
  });

  // Find matching leaf/key nodes
  allNodes.forEach(n => {
    const text = n.dataset.path.toLowerCase();
    // Check key and value text content (direct, not children)
    const directText = getDirectText(n).toLowerCase();
    if (text.includes(query) || directText.includes(query)) {
      // Show this node and all ancestors
      n.classList.remove('jv-hidden');
      n.classList.add('jv-match');
      showAncestors(n);
      // Also show children of matching containers
      n.querySelectorAll('.jv-node').forEach(child => child.classList.remove('jv-hidden'));
    }
  });

  // Highlight matching text
  highlightMatches(query);
}

function getDirectText(node) {
  let text = '';
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.classList && !child.classList.contains('jv-children') && !child.classList.contains('jv-close')) {
      text += child.textContent;
    }
  }
  return text;
}

function showAncestors(node) {
  let parent = node.parentElement;
  while (parent) {
    if (parent.classList && parent.classList.contains('jv-node')) {
      parent.classList.remove('jv-hidden', 'collapsed');
    }
    parent = parent.parentElement;
  }
}

function highlightMatches(query) {
  const walker = document.createTreeWalker(jsonTree, NodeFilter.SHOW_TEXT, null, false);
  const matches = [];
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const idx = textNode.textContent.toLowerCase().indexOf(query);
    if (idx !== -1 && !textNode.parentElement.classList.contains('jv-toggle')) {
      matches.push({ node: textNode, index: idx, length: query.length });
    }
  }
  // Apply highlights in reverse to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { node, index, length } = matches[i];
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + length);
    const mark = document.createElement('mark');
    mark.className = 'jv-highlight';
    range.surroundContents(mark);
  }
}

function removeHighlights() {
  jsonTree.querySelectorAll('.jv-highlight').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}
