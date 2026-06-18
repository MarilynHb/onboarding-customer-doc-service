import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, query, orderBy,
  onSnapshot, addDoc, serverTimestamp,
  deleteDoc, doc, setDoc, updateDoc, deleteField
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// TODO: Replace with your Firebase project config — console.firebase.google.com › Project settings › Your apps
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA8uTtDUmD1ld4BK1Ew_g4fyQME2OVtj_o',
  authDomain: 'onboarding-notes.firebaseapp.com',
  projectId: 'onboarding-notes',
  storageBucket: 'onboarding-notes.firebasestorage.app',
  messagingSenderId: '910709789931',
  appId: '1:910709789931:web:a956793eff8b1707245aae'
};
// Firestore security rules (paste into Firebase console › Firestore › Rules):
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /notes/{panelId}/items/{item} { allow read, write: if true; }
//     match /progress/{document} { allow read, write: if true; }
//   }
// }

let db = null;
try {
  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
  db = getFirestore(app);
} catch {}

let activeNotesUnsubscribe = null;

const TABS = [
  'overview',
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8',
  'reference'
];

const TAB_LABELS = {
  overview: 'Overview',
  c1: 'Orientation',
  c2: 'Domain',
  c3: 'Store + database',
  c4: 'Application',
  c5: 'Service layer',
  c6: 'Api layer',
  c7: 'Docker',
  c8: 'Blazor UI',
  d1: 'Orientation',
  d2: 'Domain',
  d3: 'Application',
  d4: 'Service + blob storage',
  d5: 'Store + database',
  d6: 'Api + file handling',
  d7: 'Connecting the services',
  d8: 'Full stack + stretch',
  reference: 'Reference card'
};

const MILESTONES = [
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'
];

const STORAGE_KEY = 'onboarding-project-progress';
const LAST_TAB_KEY = 'onboarding-last-tab';
const PANEL_FOLDER = './panels';
const panelCache = {};

function getProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch {}
}

function buildSidebarHtml() {
  return `
    <div class="sidebar-brand">Onboarding project</div>
    <div class="sidebar-title">Building services, the Moneygate way</div>

    <div class="sidebar-progress">
      <div class="progress-track">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text" id="progressText">0 of 16 steps done</div>
    </div>

    <div class="nav-group">
      <button class="nav-item active" data-tab="overview">
        <span class="nav-num">★</span>
        <span>Overview</span>
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Part 1 · Customer service</div>
      <button class="nav-item" data-tab="c1"><span class="nav-num">1</span><span>Orientation</span></button>
      <button class="nav-item" data-tab="c2"><span class="nav-num">2</span><span>Domain</span></button>
      <button class="nav-item" data-tab="c3"><span class="nav-num">3</span><span>Store + database</span></button>
      <button class="nav-item" data-tab="c4"><span class="nav-num">4</span><span>Application</span></button>
      <button class="nav-item" data-tab="c5"><span class="nav-num">5</span><span>Service layer</span></button>
      <button class="nav-item" data-tab="c6"><span class="nav-num">6</span><span>Api layer</span></button>
      <button class="nav-item" data-tab="c7"><span class="nav-num">7</span><span>Docker</span></button>
      <button class="nav-item" data-tab="c8"><span class="nav-num">8</span><span>Blazor UI</span></button>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Part 2 · Document service</div>
      <button class="nav-item" data-tab="d1"><span class="nav-num">1</span><span>Orientation</span></button>
      <button class="nav-item" data-tab="d2"><span class="nav-num">2</span><span>Domain</span></button>
      <button class="nav-item" data-tab="d3"><span class="nav-num">3</span><span>Application</span></button>
      <button class="nav-item" data-tab="d4"><span class="nav-num">4</span><span>Service + blob</span></button>
      <button class="nav-item" data-tab="d5"><span class="nav-num">5</span><span>Store + database</span></button>
      <button class="nav-item" data-tab="d6"><span class="nav-num">6</span><span>Api + files</span></button>
      <button class="nav-item" data-tab="d7"><span class="nav-num">7</span><span>Connecting services</span></button>
      <button class="nav-item" data-tab="d8"><span class="nav-num">8</span><span>Full stack + stretch</span></button>
    </div>

    <div class="nav-group">
      <button class="nav-item" data-tab="reference">
        <span class="nav-num">∗</span>
        <span>Reference card</span>
      </button>
    </div>
  `;
}

async function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === name);
  });

  window.scrollTo({ top: 0, behavior: 'auto' });
  updateFooterNav(name);

  try { localStorage.setItem(LAST_TAB_KEY, name); } catch {}

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');

  await renderPanel(name);
}

function updateFooterNav(currentName) {
  const idx = TABS.indexOf(currentName);
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const prevText = document.getElementById('prevText');
  const nextText = document.getElementById('nextText');

  if (!prevBtn || !nextBtn || !prevText || !nextText) return;

  if (idx <= 0) {
    prevBtn.disabled = true;
    prevText.textContent = '—';
  } else {
    prevBtn.disabled = false;
    prevText.textContent = TAB_LABELS[TABS[idx - 1]];
  }

  if (idx >= TABS.length - 1) {
    nextBtn.disabled = true;
    nextText.textContent = '—';
  } else {
    nextBtn.disabled = false;
    nextText.textContent = TAB_LABELS[TABS[idx + 1]];
  }
}

function navigate(direction) {
  const active = document.querySelector('.nav-item.active');
  if (!active) return;
  const idx = TABS.indexOf(active.dataset.tab);
  const next = idx + direction;
  if (next >= 0 && next < TABS.length) {
    switchTab(TABS[next]);
  }
}

async function toggleMilestone(name) {
  if (!db) {
    const progress = getProgress();
    progress[name] = !progress[name];
    if (!progress[name]) delete progress[name];
    saveProgress(progress);
    renderProgressUI();
    return;
  }
  const progressDoc = doc(db, 'progress', 'shared');
  const isDone = !getProgress()[name];
  try {
    if (isDone) {
      await setDoc(progressDoc, { [name]: true }, { merge: true });
    } else {
      await updateDoc(progressDoc, { [name]: deleteField() });
    }
  } catch (err) {
    console.error('Failed to save progress:', err);
  }
}

function renderProgressUI() {
  const progress = getProgress();
  const done = MILESTONES.filter(m => progress[m]).length;
  const total = MILESTONES.length;

  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  if (progressText) progressText.textContent = `${done} of ${total} steps done`;
  if (progressFill) progressFill.style.width = `${(done / total) * 100}%`;

  document.querySelectorAll('.nav-item').forEach(item => {
    const name = item.dataset.tab;
    if (MILESTONES.includes(name)) {
      item.classList.toggle('done', !!progress[name]);
    }
  });

  document.querySelectorAll('.done-toggle').forEach(btn => {
    const name = btn.dataset.milestone;
    const isDone = !!progress[name];
    btn.classList.toggle('done', isDone);
    const label = btn.querySelector('.toggle-label');
    if (label) label.textContent = isDone ? 'Completed' : 'Mark step as complete';
  });
}

function ensureActivePanelHtml(html) {
  return html.replace(/class="panel(?! active)"/, 'class="panel active"');
}

async function fetchPanelHtml(name) {
  if (panelCache[name]) return panelCache[name];

  const response = await fetch(`${PANEL_FOLDER}/${name}.html`);
  if (!response.ok) {
    throw new Error(`Failed to load panel content for ${name}`);
  }

  const html = await response.text();
  panelCache[name] = html;
  return html;
}

async function renderPanel(name) {
  if (activeNotesUnsubscribe) {
    activeNotesUnsubscribe();
    activeNotesUnsubscribe = null;
  }

  const panelsContainer = document.getElementById('panels');
  if (!panelsContainer) return;

  panelsContainer.innerHTML = '<div class="panel active"><p>Loading content…</p></div>';

  try {
    const html = ensureActivePanelHtml(await fetchPanelHtml(name));
    panelsContainer.innerHTML = html;
  } catch (error) {
    console.error(error);
    panelsContainer.innerHTML = `<div class="panel active"><div class="callout callout-accent"><span class="callout-icon">!</span><div>Unable to load content for ${name}. Please refresh the page.</div></div></div>`;
  }

  wrapWithTabs(panelsContainer.querySelector('.panel[data-has-notes]'));
  attachPanelEvents();
  if (window.mermaid) {
    try {
      mermaid.init(undefined, panelsContainer.querySelectorAll('.mermaid'));
    } catch (error) {
      console.error('Mermaid rendering failed:', error);
    }
  }
  attachDiagramZoomButtons();
  renderProgressUI();
}

function attachPanelEvents() {
  const content = document.querySelector('.content');
  if (!content || content.dataset.eventsAttached) return;

  content.addEventListener('click', (event) => {
    const button = event.target.closest('.done-toggle');
    if (!button) return;
    event.preventDefault();
    toggleMilestone(button.dataset.milestone);
  });

  content.dataset.eventsAttached = '1';
}

function attachDiagramZoomButtons() {
  document.querySelectorAll('.mermaid').forEach((block) => {
    if (block.querySelector('.diagram-zoom-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'diagram-zoom-btn';
    button.textContent = 'Zoom';
    button.addEventListener('click', () => openDiagramModal(block));
    block.appendChild(button);
  });
}

function openDiagramModal(sourceElement) {
  const modal = document.getElementById('diagramModal');
  if (!modal) return;

  const body = modal.querySelector('.diagram-modal-body');
  body.innerHTML = '';

  const clone = sourceElement.cloneNode(true);
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.zoom = '1';
  clone.querySelectorAll('.diagram-zoom-btn').forEach(btn => btn.remove());
  body.appendChild(clone);

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDiagramModal() {
  const modal = document.getElementById('diagramModal');
  if (!modal) return;

  const body = modal.querySelector('.diagram-modal-body');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  body.innerHTML = '';
}

function attachModalEvents() {
  const modal = document.getElementById('diagramModal');
  if (!modal) return;

  modal.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', closeDiagramModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeDiagramModal();
    }
  });
}

function attachEventHandlers() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  document.querySelectorAll('.done-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleMilestone(btn.dataset.milestone));
  });

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));

  const mobileToggle = document.getElementById('mobileToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    if (event.key === 'ArrowLeft' && !event.metaKey && !event.ctrlKey) navigate(-1);
    if (event.key === 'ArrowRight' && !event.metaKey && !event.ctrlKey) navigate(1);
  });
}

async function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = buildSidebarHtml();
  attachEventHandlers();
  attachModalEvents();
  initProgressSync();

  try {
    const last = localStorage.getItem(LAST_TAB_KEY);
    if (last && TABS.includes(last)) {
      await switchTab(last);
    } else {
      await switchTab('overview');
    }
  } catch {
    await switchTab('overview');
  }
}

function initProgressSync() {
  if (!db) return;
  const progressDoc = doc(db, 'progress', 'shared');
  onSnapshot(progressDoc, snapshot => {
    const data = snapshot.exists() ? snapshot.data() : {};
    const progress = {};
    MILESTONES.forEach(m => { if (data[m]) progress[m] = true; });
    saveProgress(progress);
    renderProgressUI();
  }, err => {
    console.error('Progress sync error:', err);
  });
}

function wrapWithTabs(panelEl) {
  if (!panelEl) return;

  const namedNotesEls = Array.from(panelEl.querySelectorAll(':scope > .named-notes'));
  namedNotesEls.forEach(el => el.remove());

  const rail = document.createElement('div');
  rail.className = 'panel-tab-rail';

  const guideBtn = document.createElement('button');
  guideBtn.type = 'button';
  guideBtn.className = 'panel-tab-btn active';
  guideBtn.dataset.tab = 'guide';
  guideBtn.textContent = 'Guide';

  const notesBtn = document.createElement('button');
  notesBtn.type = 'button';
  notesBtn.className = 'panel-tab-btn';
  notesBtn.dataset.tab = 'notes';
  notesBtn.textContent = 'Notes';

  rail.appendChild(guideBtn);
  rail.appendChild(notesBtn);

  const guideContent = document.createElement('div');
  guideContent.className = 'panel-tab-content';
  guideContent.dataset.tabContent = 'guide';
  while (panelEl.firstChild) guideContent.appendChild(panelEl.firstChild);

  const notesContent = document.createElement('div');
  notesContent.className = 'panel-tab-content';
  notesContent.dataset.tabContent = 'notes';
  notesContent.hidden = true;
  buildNotesShell(notesContent, namedNotesEls);

  const wrapper = document.createElement('div');
  wrapper.className = 'panel-tabs';
  wrapper.appendChild(rail);
  wrapper.appendChild(guideContent);
  wrapper.appendChild(notesContent);
  panelEl.appendChild(wrapper);

  rail.addEventListener('click', e => {
    const btn = e.target.closest('.panel-tab-btn');
    if (!btn) return;
    const tab = btn.dataset.tab;
    rail.querySelectorAll('.panel-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    guideContent.hidden = tab !== 'guide';
    notesContent.hidden = tab !== 'notes';
    if (tab === 'notes' && !notesContent.dataset.initialized) {
      notesContent.dataset.initialized = '1';
      initNotesTab(notesContent, panelEl.dataset.panel);
    }
  });
}

function buildNotesShell(container, namedNotesEls) {
  namedNotesEls.forEach(el => {
    el.removeAttribute('hidden');
    const hasContent = el.children.length > 0 || el.textContent.trim().length > 0;
    if (!hasContent) return;

    const section = document.createElement('div');
    section.className = 'named-notes-section';

    const header = document.createElement('div');
    header.className = 'named-notes-header';
    header.textContent = `${el.dataset.author}'s Notes`;
    section.appendChild(header);

    const body = document.createElement('div');
    body.className = 'named-notes-body';
    while (el.firstChild) body.appendChild(el.firstChild);
    section.appendChild(body);
    container.appendChild(section);
  });

  const communityLabel = document.createElement('div');
  communityLabel.className = 'notes-section-label';
  communityLabel.textContent = 'Community Notes';
  container.appendChild(communityLabel);

  const notesList = document.createElement('div');
  notesList.className = 'notes-list';
  notesList.innerHTML = '<p class="notes-loading">Loading…</p>';
  container.appendChild(notesList);

  const addLabel = document.createElement('div');
  addLabel.className = 'notes-section-label';
  addLabel.textContent = 'Add a note';
  container.appendChild(addLabel);

  const textarea = document.createElement('textarea');
  textarea.className = 'notes-textarea';
  textarea.placeholder = 'Share a tip, observation, or question about this step…';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'notes-submit';
  submitBtn.textContent = 'Submit';
  submitBtn.disabled = true;

  textarea.addEventListener('input', () => {
    submitBtn.disabled = !textarea.value.trim();
  });

  const form = document.createElement('div');
  form.className = 'notes-form';
  form.appendChild(textarea);
  form.appendChild(submitBtn);
  container.appendChild(form);

  container._notesList = notesList;
  container._textarea = textarea;
  container._submitBtn = submitBtn;
}

function initNotesTab(container, panelId) {
  if (!db) {
    container._notesList.innerHTML = '<p class="notes-empty">Community notes require Firebase — add your project config to onboarding-sidebar.js.</p>';
    return;
  }

  const notesCol = collection(db, 'notes', panelId, 'items');
  const q = query(notesCol, orderBy('createdAt', 'asc'));

  activeNotesUnsubscribe = onSnapshot(q, snapshot => {
    const notes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNotesList(container._notesList, notes, notesCol);
  }, err => {
    console.error('Notes snapshot error:', err);
    container._notesList.innerHTML = '<p class="notes-empty">Could not load notes.</p>';
  });

  container._submitBtn.addEventListener('click', async () => {
    const text = container._textarea.value.trim();
    if (!text) return;
    container._submitBtn.disabled = true;
    container._submitBtn.textContent = 'Saving…';
    try {
      await addDoc(notesCol, { text, createdAt: serverTimestamp() });
      container._textarea.value = '';
      container._submitBtn.textContent = 'Submit';
    } catch (err) {
      console.error('Failed to save note:', err);
      container._submitBtn.textContent = 'Submit';
      container._submitBtn.disabled = false;
    }
  });
}

function renderNotesList(container, notes, notesCol) {
  if (!notes.length) {
    container.innerHTML = '<p class="notes-empty">No notes yet. Be the first to add one.</p>';
    return;
  }
  container.innerHTML = '';
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';

    const text = document.createElement('div');
    text.className = 'note-card-text';
    text.textContent = note.text;

    const meta = document.createElement('div');
    meta.className = 'note-card-meta';
    meta.textContent = note.createdAt ? formatNoteTime(note.createdAt.toDate()) : 'Just now';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'note-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete note';
    deleteBtn.addEventListener('click', async () => {
      try {
        await deleteDoc(doc(notesCol, note.id));
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    });

    card.appendChild(text);
    card.appendChild(meta);
    card.appendChild(deleteBtn);
    container.appendChild(card);
  });
}

function formatNoteTime(date) {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', initializeSidebar);
