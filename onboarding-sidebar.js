const TABS = ['overview', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm8', 'm7', 'reference'];
const TAB_LABELS = {
  overview: 'Overview',
  m1: 'Orientation',
  m2: 'Domain layer',
  m3: 'Application layer',
  m4: 'Infrastructure',
  m5: 'Web layer',
  m6: 'Onboarding service',
  m8: 'Blazor UI + stretch',
  m7: 'Docker Compose',
  reference: 'Reference card'
};
const MILESTONES = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
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
    <div class="sidebar-title">Your customer document service</div>

    <div class="sidebar-progress">
      <div class="progress-track">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text" id="progressText">0 of 8 milestones done</div>
    </div>

    <div class="nav-group">
      <button class="nav-item active" data-tab="overview">
        <span class="nav-num">★</span>
        <span>Overview</span>
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Documents Service</div>
      <button class="nav-item" data-tab="m1"><span class="nav-num">01</span><span>Orientation</span></button>
      <button class="nav-item" data-tab="m2"><span class="nav-num">02</span><span>Domain layer</span></button>
      <button class="nav-item" data-tab="m3"><span class="nav-num">03</span><span>Application layer</span></button>
      <button class="nav-item" data-tab="m4"><span class="nav-num">04</span><span>Infrastructure</span></button>
      <button class="nav-item" data-tab="m5"><span class="nav-num">05</span><span>Web layer</span></button>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Customer Onboarding</div>
      <button class="nav-item" data-tab="m6"><span class="nav-num">06</span><span>Onboarding service</span></button>
      <button class="nav-item" data-tab="m8"><span class="nav-num">08</span><span>Blazor UI + stretch</span></button>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Bringing it together</div>
      <button class="nav-item" data-tab="m7"><span class="nav-num">07</span><span>Docker Compose</span></button>
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
  if (progressText) progressText.textContent = `${done} of ${total} milestones done`;
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
    if (label) label.textContent = isDone ? 'Completed' : 'Mark milestone as complete';
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
