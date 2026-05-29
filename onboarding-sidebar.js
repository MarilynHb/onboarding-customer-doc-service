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
  c3: 'Application contracts',
  c4: 'Service layer',
  c5: 'Store + database',
  c6: 'Api layer',
  c7: 'Docker',
  c8: 'Blazor UI',
  d1: 'Orientation',
  d2: 'Domain',
  d3: 'Application contracts',
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
      <button class="nav-item" data-tab="c3"><span class="nav-num">3</span><span>Application contracts</span></button>
      <button class="nav-item" data-tab="c4"><span class="nav-num">4</span><span>Service layer</span></button>
      <button class="nav-item" data-tab="c5"><span class="nav-num">5</span><span>Store + database</span></button>
      <button class="nav-item" data-tab="c6"><span class="nav-num">6</span><span>Api layer</span></button>
      <button class="nav-item" data-tab="c7"><span class="nav-num">7</span><span>Docker</span></button>
      <button class="nav-item" data-tab="c8"><span class="nav-num">8</span><span>Blazor UI</span></button>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Part 2 · Document service</div>
      <button class="nav-item" data-tab="d1"><span class="nav-num">1</span><span>Orientation</span></button>
      <button class="nav-item" data-tab="d2"><span class="nav-num">2</span><span>Domain</span></button>
      <button class="nav-item" data-tab="d3"><span class="nav-num">3</span><span>Application contracts</span></button>
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

function toggleMilestone(name) {
  const progress = getProgress();
  progress[name] = !progress[name];
  if (!progress[name]) delete progress[name];
  saveProgress(progress);
  renderProgressUI();
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

document.addEventListener('DOMContentLoaded', initializeSidebar);
