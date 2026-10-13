// Frontend logic for Antigravity Browser Extension

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // DOM Elements
  // ---------------------------------------------------------------------------
  const backBtn = document.getElementById('backBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const homeBtn = document.getElementById('homeBtn');

  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const protocolBadge = document.getElementById('protocolBadge');
  const badgeIcon = document.getElementById('badgeIcon');
  const starBtn = document.getElementById('starBtn');
  const starIcon = document.getElementById('starIcon');
  const copyUrlBtn = document.getElementById('copyUrlBtn');

  const modeToggleBtn = document.getElementById('modeToggleBtn');
  const modeLabel = document.getElementById('modeLabel');
  const viewportSelect = document.getElementById('viewportSelect');
  const rotateBtn = document.getElementById('rotateBtn');
  const openExternalBtn = document.getElementById('openExternalBtn');
  const askAgentBtn = document.getElementById('askAgentBtn');

  const loadingBar = document.getElementById('loadingBar');

  const homeView = document.getElementById('homeView');
  const webviewContainer = document.getElementById('webviewContainer');
  const viewportFrame = document.getElementById('viewportFrame');
  const deviceBezelTop = document.getElementById('deviceBezelTop');
  const deviceLabel = document.getElementById('deviceLabel');
  const browserFrame = document.getElementById('browserFrame');

  const frameWarningBanner = document.getElementById('frameWarningBanner');
  const switchToProxyBtn = document.getElementById('switchToProxyBtn');
  const bannerOpenExternalBtn = document.getElementById('bannerOpenExternalBtn');
  const dismissBannerBtn = document.getElementById('dismissBannerBtn');

  const agentDrawer = document.getElementById('agentDrawer');
  const agentTargetUrl = document.getElementById('agentTargetUrl');
  const closeAgentDrawerBtn = document.getElementById('closeAgentDrawerBtn');
  const agentPromptInput = document.getElementById('agentPromptInput');
  const submitAgentPromptBtn = document.getElementById('submitAgentPromptBtn');

  const rescanServersBtn = document.getElementById('rescanServersBtn');
  const devServersContainer = document.getElementById('devServersContainer');
  const homeBookmarksList = document.getElementById('homeBookmarksList');
  const addBookmarkBtn = document.getElementById('addBookmarkBtn');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  const bookmarkModal = document.getElementById('bookmarkModal');
  const bookmarkForm = document.getElementById('bookmarkForm');
  const closeBookmarkModalBtn = document.getElementById('closeBookmarkModalBtn');
  const cancelBookmarkBtn = document.getElementById('cancelBookmarkBtn');
  const bmTitle = document.getElementById('bmTitle');
  const bmUrl = document.getElementById('bmUrl');

  const toastEl = document.getElementById('toast');

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let currentUrl = null;
  let currentTitle = '';
  let navHistory = [];
  let navIndex = -1;
  let mode = 'direct'; // 'direct' | 'proxy'
  let viewport = 'responsive';
  let isRotated = false;
  let bookmarks = [];
  let activeDevServers = [];
  let loadTimeout = null;

  // Viewport dimensions map
  const DEVICE_SPECS = {
    'responsive': { name: 'Responsive', width: '100%', height: '100%', isDevice: false },
    'desktop': { name: 'Desktop', width: 1280, height: 800, isDevice: true },
    'tablet': { name: 'Tablet (iPad)', width: 768, height: 1024, isDevice: true },
    'mobile-se': { name: 'Mobile SE', width: 375, height: 667, isDevice: true },
    'mobile-pro': { name: 'Mobile Pro', width: 390, height: 844, isDevice: true }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function showToast(message, duration = 2500) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  async function apiFetch(path, options = {}) {
    if (window.sidecar && typeof window.sidecar.fetch === 'function') {
      return window.sidecar.fetch(path, options);
    }
    return fetch(path, options);
  }

  function sanitizeUrlInput(input) {
    if (!input || typeof input !== 'string') return '';
    let val = input.trim();

    // Check if localhost without protocol
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(val)) {
      return `http://${val}`;
    }

    // Check if domain-like (e.g. example.com, github.com/user, mdn.io)
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(val) && !val.includes(' ')) {
      return `https://${val}`;
    }

    // Check if already has valid protocol
    if (/^[a-z]+:\/\//i.test(val)) {
      return val;
    }

    // Otherwise treat as search query (DuckDuckGo)
    return `https://duckduckgo.com/?q=${encodeURIComponent(val)}`;
  }

  function updateProtocolBadge(url) {
    protocolBadge.className = 'protocol-badge';
    if (!url) {
      protocolBadge.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      return;
    }

    if (mode === 'proxy') {
      protocolBadge.classList.add('proxy');
      protocolBadge.title = 'Proxied connection (X-Frame-Options stripped)';
      protocolBadge.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    } else if (url.startsWith('https://')) {
      protocolBadge.classList.add('secure');
      protocolBadge.title = 'Secure connection (HTTPS)';
      protocolBadge.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
      protocolBadge.classList.add('local');
      protocolBadge.title = 'Local development server';
      protocolBadge.innerHTML = `<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`;
    } else {
      protocolBadge.title = 'Standard HTTP connection';
      protocolBadge.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;
    }
  }

  function updateNavButtons() {
    backBtn.disabled = navIndex <= 0;
    forwardBtn.disabled = navIndex >= navHistory.length - 1;
  }

  function updateStarIcon() {
    if (!currentUrl) {
      starBtn.classList.remove('active');
      starBtn.title = 'Bookmark this page';
      return;
    }
    const isBookmarked = bookmarks.some((b) => b.url === currentUrl);
    if (isBookmarked) {
      starBtn.classList.add('active');
      starBtn.title = 'Remove bookmark';
    } else {
      starBtn.classList.remove('active');
      starBtn.title = 'Bookmark this page';
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation Engine
  // ---------------------------------------------------------------------------
  function navigate(rawUrl, options = {}) {
    if (!rawUrl) return;
    const url = sanitizeUrlInput(rawUrl);
    const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');
    if (forceMode) {
      setMode(forceMode);
    } else if (options.autoDetectMode !== false) {
      // Smart detection: external websites (e.g. github, google) usually set X-Frame-Options.
      // Default external sites to proxy mode so they render properly in-app.
      if (!isLocal && mode !== 'proxy') {
        mode = 'proxy';
        modeToggleBtn.classList.add('proxy');
        modeLabel.textContent = 'Proxy';
      } else if (isLocal && mode !== 'direct') {
        mode = 'direct';
        modeToggleBtn.classList.remove('proxy');
        modeLabel.textContent = 'Direct';
      }
    }

    currentUrl = url;
    currentTitle = url;
    urlInput.value = url;
    updateProtocolBadge(url);
    updateStarIcon();

    // Show webview, hide home
    homeView.hidden = true;
    webviewContainer.hidden = false;
    frameWarningBanner.hidden = true;

    // Push to navigation stack
    if (addToStack) {
      if (navIndex < navHistory.length - 1) {
        navHistory = navHistory.slice(0, navIndex + 1);
      }
      navHistory.push(url);
      navIndex = navHistory.length - 1;
    }
    updateNavButtons();

    // Progress bar start
    loadingBar.classList.add('active');
    clearTimeout(loadTimeout);

    // Compute target src
    let targetSrc = url;
    if (mode === 'proxy') {
      targetSrc = `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    browserFrame.src = targetSrc;

    // Log to history API
    logHistoryEntry(url);

    // Watchdog for iframe embedding errors (external sites with X-Frame-Options)
    if (mode === 'direct' && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      loadTimeout = setTimeout(() => {
        // If external site and direct mode, show helpful proxy banner if user might be blocked
        frameWarningBanner.hidden = false;
      }, 3500);
    }
  }

  function goHome() {
    currentUrl = null;
    urlInput.value = '';
    homeView.hidden = false;
    webviewContainer.hidden = true;
    frameWarningBanner.hidden = true;
    updateProtocolBadge(null);
    updateStarIcon();
    loadingBar.classList.remove('active');
  }

  function setMode(newMode) {
    mode = newMode;
    if (mode === 'proxy') {
      modeToggleBtn.classList.add('proxy');
      modeLabel.textContent = 'Proxy';
      modeToggleBtn.title = 'Proxy Mode active (stripping X-Frame-Options / CSP)';
    } else {
      modeToggleBtn.classList.remove('proxy');
      modeLabel.textContent = 'Direct';
      modeToggleBtn.title = 'Direct Embed active (best for localhost dev servers)';
    }
    updateProtocolBadge(currentUrl);

    if (currentUrl) {
      navigate(currentUrl, { addToStack: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Viewport / Responsive Simulation
  // ---------------------------------------------------------------------------
  function applyViewport(presetKey) {
    viewport = presetKey;
    const spec = DEVICE_SPECS[presetKey] || DEVICE_SPECS.responsive;

    if (!spec.isDevice) {
      viewportFrame.className = 'viewport-frame responsive';
      viewportFrame.style.width = '100%';
      viewportFrame.style.height = '100%';
      deviceBezelTop.hidden = true;
      deviceLabel.hidden = true;
      rotateBtn.hidden = true;
      return;
    }

    rotateBtn.hidden = false;
    let w = spec.width;
    let h = spec.height;

    if (isRotated) {
      [w, h] = [h, w];
    }

    viewportFrame.className = 'viewport-frame device-sim';
    viewportFrame.style.width = `${w}px`;
    viewportFrame.style.height = `${h}px`;

    deviceBezelTop.hidden = false;
    deviceLabel.hidden = false;
    deviceLabel.textContent = `${spec.name} • ${w} × ${h}px`;
  }

  // ---------------------------------------------------------------------------
  // Dev Server Auto-Discovery
  // ---------------------------------------------------------------------------
  async function scanDevServers() {
    devServersContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner sm"></div>
        <span>Scanning local dev ports (3000, 5173, 8000, 8080...)...</span>
      </div>
    `;

    try {
      const res = await apiFetch('/api/scan-dev-servers', { method: 'GET' });
      const data = await res.json();
      activeDevServers = data?.activeServers || [];

      renderDevServers(activeDevServers);
    } catch (err) {
      devServersContainer.innerHTML = `
        <div class="empty-servers-box">
          <p>Unable to scan ports: ${err.message}</p>
        </div>
      `;
    }
  }

  function renderDevServers(servers) {
    if (!servers || servers.length === 0) {
      devServersContainer.innerHTML = `
        <div class="empty-servers-box">
          <p>No active dev servers found on standard ports (3000, 5173, 8000, 8080...).</p>
          <span class="small muted">Start your local server (e.g. <code>npm run dev</code>) and click Rescan.</span>
        </div>
      `;
      return;
    }

    devServersContainer.innerHTML = '';
    servers.forEach((srv) => {
      const card = document.createElement('div');
      card.className = 'server-item-card';
      card.innerHTML = `
        <div class="server-meta">
          <span class="server-name">${srv.name}</span>
          <span class="server-url">${srv.url}</span>
          <div class="live-indicator">Active Listener</div>
        </div>
        <button class="btn btn-sm btn-primary">Open</button>
      `;
      card.onclick = () => navigate(srv.url);
      card.style.cursor = 'pointer';
      devServersContainer.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // Bookmarks Management
  // ---------------------------------------------------------------------------
  async function loadBookmarks() {
    try {
      const res = await apiFetch('/api/bookmarks', { method: 'GET' });
      const data = await res.json();
      bookmarks = data?.bookmarks || [];
      renderBookmarks();
      updateStarIcon();
    } catch (err) {
      console.error('Error loading bookmarks:', err);
    }
  }

  function renderBookmarks() {
    // Home Dashboard Bookmarks Grid
    homeBookmarksList.innerHTML = '';
    bookmarks.forEach((bm) => {
      const card = document.createElement('div');
      card.className = 'bookmark-card';
      card.innerHTML = `
        <div class="bm-info">
          <span class="bm-title">${escapeHtml(bm.title)}</span>
          <span class="bm-url">${escapeHtml(bm.url)}</span>
        </div>
        <button class="bm-del-btn" title="Delete bookmark">✕</button>
      `;
      card.onclick = () => navigate(bm.url);
      card.querySelector('.bm-del-btn').onclick = (e) => {
        e.stopPropagation();
        deleteBookmark(bm.id);
      };
      homeBookmarksList.appendChild(card);
    });
  }

  async function saveBookmarks(newBookmarks) {
    bookmarks = newBookmarks;
    renderBookmarks();
    updateStarIcon();
    try {
      await apiFetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks })
      });
    } catch (err) {
      console.error('Error saving bookmarks:', err);
    }
  }

  function toggleBookmarkCurrent() {
    if (!currentUrl) return;
    const existingIndex = bookmarks.findIndex((b) => b.url === currentUrl);
    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1);
      saveBookmarks(bookmarks);
      showToast('Bookmark removed');
    } else {
      const title = currentTitle || currentUrl;
      bookmarks.unshift({
        id: 'bm_' + Date.now(),
        title,
        url: currentUrl,
        category: 'custom'
      });
      saveBookmarks(bookmarks);
      showToast('Bookmark added');
    }
  }

  function deleteBookmark(id) {
    const updated = bookmarks.filter((b) => b.id !== id);
    saveBookmarks(updated);
    showToast('Bookmark deleted');
  }

  // ---------------------------------------------------------------------------
  // History Management
  // ---------------------------------------------------------------------------
  async function loadHistory() {
    try {
      const res = await apiFetch('/api/history', { method: 'GET' });
      const data = await res.json();
      renderHistory(data?.history || []);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }

  function renderHistory(items) {
    historyList.innerHTML = '';
    if (!items || items.length === 0) {
      historyList.innerHTML = `<span class="muted small" style="padding:8px;">No recent history.</span>`;
      return;
    }

    items.slice(0, 15).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      row.innerHTML = `
        <div class="history-main">
          <span class="history-icon">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </span>
          <span class="history-text">${escapeHtml(item.title || item.url)}</span>
        </div>
        <span class="history-time">${timeStr}</span>
      `;
      row.onclick = () => navigate(item.url);
      historyList.appendChild(row);
    });
  }

  async function logHistoryEntry(url) {
    try {
      const res = await apiFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: { url, title: currentTitle || url } })
      });
      const data = await res.json();
      renderHistory(data?.history || []);
    } catch (err) {
      console.error('Error logging history:', err);
    }
  }

  async function clearHistory() {
    try {
      await apiFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true })
      });
      renderHistory([]);
      showToast('History cleared');
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Agent Chat Integration
  // ---------------------------------------------------------------------------
  function openAgentDrawer() {
    const target = currentUrl || 'Current Web Workspace';
    agentTargetUrl.textContent = target;
    agentDrawer.classList.add('open');
    agentPromptInput.focus();
  }

  function closeAgentDrawer() {
    agentDrawer.classList.remove('open');
  }

  async function sendPromptToAgent(promptText) {
    if (!promptText || !promptText.trim()) return;
    const finalPrompt = promptText.trim();

    closeAgentDrawer();
    showToast('Sending prompt to Antigravity Agent...');

    try {
      if (window.sidecar && window.sidecar.agent) {
        if (window.sidecar.agent.sendMessage) {
          const convId = window.sidecar.conversationId || undefined;
          await window.sidecar.agent.sendMessage(finalPrompt, convId);
        } else if (window.sidecar.agent.startConversation) {
          await window.sidecar.agent.startConversation(finalPrompt);
        }
        showToast('Message sent to chat!');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(finalPrompt);
        showToast('Prompt copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sending message to agent:', err);
      showToast('Failed to send to agent: ' + err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Utility & Event Listeners
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function extractUrlFrom(str) {
    if (!str || typeof str !== 'string') return null;
    try {
      const parsed = new URL(str, window.location.origin || 'http://localhost');
      let val = parsed.searchParams.get('url');
      if (!val && parsed.hash) {
        const hashPart = parsed.hash.replace(/^#\/?/, '');
        const hashQuery = hashPart.includes('?') ? hashPart.split('?')[1] : hashPart;
        const hashParams = new URLSearchParams(hashQuery);
        val = hashParams.get('url');
      }
      if (!val && str.includes('url=')) {
        const m = str.match(/[?&#]url=([^&#]+)/);
        if (m) val = decodeURIComponent(m[1]);
      }
      if (val) {
        val = val.trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'")) ||
            (val.startsWith('`') && val.endsWith('`'))) {
          val = val.slice(1, -1).trim();
        }
        return val;
      }
    } catch {}
    return null;
  }

  function parseInitialUrl() {
    return extractUrlFrom(window.location.href);
  }

  function checkUrlParams() {
    const extracted = parseInitialUrl();
    if (extracted && extracted !== currentUrl) {
      navigate(extracted);
      return true;
    }
    return false;
  }

  window.addEventListener('popstate', () => checkUrlParams());
  window.addEventListener('hashchange', () => checkUrlParams());

  let lastHref = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      checkUrlParams();
    }
  }, 400);

  // ---------------------------------------------------------------------------
  // Bind Events
  // ---------------------------------------------------------------------------

  // Omnibox submit
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    navigate(urlInput.value);
  });

  // Navigation buttons
  backBtn.addEventListener('click', () => {
    if (navIndex > 0) {
      navIndex--;
      navigate(navHistory[navIndex], { addToStack: false });
    }
  });

  forwardBtn.addEventListener('click', () => {
    if (navIndex < navHistory.length - 1) {
      navIndex++;
      navigate(navHistory[navIndex], { addToStack: false });
    }
  });

  reloadBtn.addEventListener('click', () => {
    if (currentUrl) {
      loadingBar.classList.add('active');
      browserFrame.src = browserFrame.src;
    }
  });

  homeBtn.addEventListener('click', () => {
    goHome();
  });

  starBtn.addEventListener('click', () => {
    toggleBookmarkCurrent();
  });

  copyUrlBtn.addEventListener('click', async () => {
    if (currentUrl) {
      await navigator.clipboard.writeText(currentUrl);
      showToast('URL copied to clipboard!');
    }
  });

  // Mode Toggle
  modeToggleBtn.addEventListener('click', () => {
    setMode(mode === 'direct' ? 'proxy' : 'direct');
  });

  // Viewport Presets
  viewportSelect.addEventListener('change', (e) => {
    applyViewport(e.target.value);
  });

  rotateBtn.addEventListener('click', () => {
    isRotated = !isRotated;
    applyViewport(viewport);
  });

  openExternalBtn.addEventListener('click', () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    }
  });

  bannerOpenExternalBtn.addEventListener('click', () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    }
  });

  switchToProxyBtn.addEventListener('click', () => {
    setMode('proxy');
    frameWarningBanner.hidden = true;
  });

  dismissBannerBtn.addEventListener('click', () => {
    frameWarningBanner.hidden = true;
  });

  // Ask Agent Drawer
  askAgentBtn.addEventListener('click', () => {
    openAgentDrawer();
  });

  closeAgentDrawerBtn.addEventListener('click', () => {
    closeAgentDrawer();
  });

  submitAgentPromptBtn.addEventListener('click', () => {
    const customText = agentPromptInput.value.trim();
    const prompt = customText || `Please examine the page running at ${currentUrl} and help me optimize and test it.`;
    sendPromptToAgent(prompt);
  });

  document.querySelectorAll('.chip-btn').forEach((chip) => {
    chip.addEventListener('click', () => {
      const promptTemplate = chip.getAttribute('data-prompt');
      const target = currentUrl || 'localhost:3000';
      sendPromptToAgent(`Target Page: ${target}\n\n${promptTemplate}`);
    });
  });

  // Dev Scanner buttons
  rescanServersBtn.addEventListener('click', () => scanDevServers());

  // Bookmark Modal
  addBookmarkBtn.addEventListener('click', () => {
    bmTitle.value = '';
    bmUrl.value = currentUrl || 'http://localhost:3000';
    bookmarkModal.hidden = false;
    bmTitle.focus();
  });

  closeBookmarkModalBtn.addEventListener('click', () => {
    bookmarkModal.hidden = true;
  });

  cancelBookmarkBtn.addEventListener('click', () => {
    bookmarkModal.hidden = true;
  });

  bookmarkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = bmTitle.value.trim();
    const url = sanitizeUrlInput(bmUrl.value.trim());
    if (title && url) {
      bookmarks.unshift({
        id: 'bm_' + Date.now(),
        title,
        url,
        category: 'custom'
      });
      saveBookmarks(bookmarks);
      bookmarkModal.hidden = true;
      showToast('Bookmark added');
    }
  });

  clearHistoryBtn.addEventListener('click', () => clearHistory());

  // Frame onload event
  browserFrame.addEventListener('load', () => {
    loadingBar.classList.remove('active');
    clearTimeout(loadTimeout);

    try {
      // If same-origin / accessible, grab title
      if (browserFrame.contentDocument && browserFrame.contentDocument.title) {
        currentTitle = browserFrame.contentDocument.title;
      }
    } catch {}
  });

  // Message listener for proxy frame & Antigravity host
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'browser:navigated') {
      if (data.url) {
        currentUrl = data.url;
        urlInput.value = currentUrl;
        currentTitle = data.title || currentUrl;
        updateProtocolBadge(currentUrl);
        updateStarIcon();
        logHistoryEntry(currentUrl);
      }
      return;
    }

    if (data.type === 'browser:navigate-request') {
      if (data.url) {
        navigate(data.url);
      }
      return;
    }

    // Host payload or raw string
    const hostTarget =
      data.url ||
      data.payload?.url ||
      data.payload?.target ||
      extractUrlFrom(typeof data === 'string' ? data : (data.url || data.payload?.url || null));

    if (hostTarget && typeof hostTarget === 'string') {
      navigate(hostTarget);
    }
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  async function init() {
    loadBookmarks();
    loadHistory();
    scanDevServers();

    const initialUrl = parseInitialUrl();
    if (initialUrl) {
      navigate(initialUrl);
    } else {
      goHome();
    }
  }

  init();
})();
