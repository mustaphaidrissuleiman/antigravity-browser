// Backend for the Antigravity In-App Browser UI extension.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Response, SidecarApp } from 'sidecar_sdk';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR || join(HERE, '.data');
const BOOKMARKS_FILE = join(DATA_DIR, 'bookmarks.json');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const STARTED_AT = Date.now();

const app = new SidecarApp();

// ---------------------------------------------------------------------------
// Static Files
// ---------------------------------------------------------------------------
const readLocal = (name) => readFileSync(join(HERE, name), 'utf8');

const serveIndex = () => readLocal('index.html');
const serveAppJs = () => readLocal('app.js');
const serveStyles = () => new Response(readLocal('styles.css'), { contentType: 'text/css' });

// Page routes
app.page('/', serveIndex);
app.page('/index.html', serveIndex);
app.page('/panel', serveIndex);
app.page('/panel/', serveIndex);
app.page('/panel/index.html', serveIndex);

// Script routes
app.page('/app.js', serveAppJs);
app.page('/panel/app.js', serveAppJs);

// Style routes
app.api('/styles.css', serveStyles, 'GET');
app.api('/panel/styles.css', serveStyles, 'GET');

// ---------------------------------------------------------------------------
// Default Bookmarks & Storage Helpers
// ---------------------------------------------------------------------------
const DEFAULT_BOOKMARKS = [
  { id: 'b1', title: 'Localhost :3000 (React / Next.js)', url: 'http://localhost:3000', category: 'dev' },
  { id: 'b2', title: 'Localhost :5173 (Vite)', url: 'http://localhost:5173', category: 'dev' },
  { id: 'b3', title: 'Localhost :8000 (Python / FastAPI)', url: 'http://localhost:8000', category: 'dev' },
  { id: 'b4', title: 'Localhost :8080 (Webpack)', url: 'http://localhost:8080', category: 'dev' },
  { id: 'b5', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', category: 'docs' },
  { id: 'b6', title: 'GitHub', url: 'https://github.com', category: 'tools' },
  { id: 'b7', title: 'Hacker News', url: 'https://news.ycombinator.com', category: 'reading' },
  { id: 'b8', title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs', category: 'docs' }
];

function loadJson(filePath, defaultValue) {
  if (!existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Dev Server Port Scanner
// ---------------------------------------------------------------------------
const COMMON_DEV_PORTS = [
  { port: 3000, name: 'React / Next.js / Node' },
  { port: 5173, name: 'Vite (Vue / React / Svelte)' },
  { port: 8000, name: 'Python (Django / FastAPI)' },
  { port: 8080, name: 'Webpack / Spring / Vue' },
  { port: 4321, name: 'Astro' },
  { port: 8501, name: 'Streamlit' },
  { port: 5000, name: 'Flask / .NET' },
  { port: 4200, name: 'Angular' },
  { port: 3001, name: 'Alt Dev Server' },
  { port: 5174, name: 'Alt Vite Server' }
];

function checkPort(port, host = '127.0.0.1', timeout = 350) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host, timeout });
    let resolved = false;

    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch {}
        resolve(result);
      }
    };

    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  });
}

// ---------------------------------------------------------------------------
// APIs
// ---------------------------------------------------------------------------

// Status & diagnostics
app.api('/api/status', () => ({
  status: 'online',
  version: '1.0.0',
  uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
  node: process.version
}), 'GET');

// Scan for active local dev servers
app.api('/api/scan-dev-servers', async () => {
  const checkPromises = COMMON_DEV_PORTS.map(async (def) => {
    const isOpen = await checkPort(def.port);
    return {
      port: def.port,
      name: def.name,
      url: `http://localhost:${def.port}`,
      isOpen
    };
  });

  const results = await Promise.all(checkPromises);
  const active = results.filter((r) => r.isOpen);
  return {
    scannedAt: Date.now(),
    activeServers: active,
    allScanned: results
  };
}, 'GET');

// Bookmarks API
app.api('/api/bookmarks', () => {
  const bookmarks = loadJson(BOOKMARKS_FILE, DEFAULT_BOOKMARKS);
  return { bookmarks };
}, 'GET');

app.api('/api/bookmarks', (data) => {
  const items = Array.isArray(data?.bookmarks) ? data.bookmarks : [];
  saveJson(BOOKMARKS_FILE, items);
  return { success: true, bookmarks: items };
});

// History API
app.api('/api/history', () => {
  const history = loadJson(HISTORY_FILE, []);
  return { history };
}, 'GET');

app.api('/api/history', (data) => {
  if (data?.clear) {
    saveJson(HISTORY_FILE, []);
    return { success: true, history: [] };
  }

  const history = loadJson(HISTORY_FILE, []);
  if (data?.entry && typeof data.entry.url === 'string') {
    const cleanUrl = data.entry.url.trim();
    if (cleanUrl) {
      // Remove any existing entry with identical URL to bubble to top
      const filtered = history.filter((h) => h.url !== cleanUrl);
      filtered.unshift({
        id: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        url: cleanUrl,
        title: data.entry.title || cleanUrl,
        timestamp: Date.now()
      });
      // Keep max 100 history items
      const trimmed = filtered.slice(0, 100);
      saveJson(HISTORY_FILE, trimmed);
      return { success: true, history: trimmed };
    }
  }

  return { success: true, history };
});

// Settings API
const DEFAULT_SETTINGS = {
  defaultMode: 'direct', // 'direct' or 'proxy'
  viewport: 'responsive', // 'responsive', 'desktop', 'tablet', 'mobile-se', 'mobile-pro'
  searchEngine: 'duckduckgo', // 'duckduckgo', 'google', 'bing'
  zoom: 100
};

app.api('/api/settings', () => {
  const settings = loadJson(SETTINGS_FILE, DEFAULT_SETTINGS);
  return { settings: { ...DEFAULT_SETTINGS, ...settings } };
}, 'GET');

app.api('/api/settings', (data) => {
  const current = loadJson(SETTINGS_FILE, DEFAULT_SETTINGS);
  const updated = { ...current, ...(data?.settings || {}) };
  saveJson(SETTINGS_FILE, updated);
  return { success: true, settings: updated };
});

// Smart Proxy API: fetches external web pages and strips framing restrictions
app.api('/api/proxy', async (data) => {
  const targetUrl = data?.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return new Response(JSON.stringify({ error: 'URL query parameter is required' }), {
      status: 400,
      contentType: 'application/json'
    });
  }

  try {
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        contentType: 'application/json'
      });
    }

    // Only allow HTTP and HTTPS protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return new Response(JSON.stringify({ error: 'Only http and https protocols are supported' }), {
        status: 400,
        contentType: 'application/json'
      });
    }

    // Protect against Cloud metadata SSRF
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === '169.254.169.254' ||
      hostname.startsWith('169.254.') ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data' ||
      hostname === '[::ffff:169.254.169.254]' ||
      hostname === 'fd00:ec2::254'
    ) {
      return new Response(JSON.stringify({ error: 'Access to cloud metadata service is forbidden' }), {
        status: 403,
        contentType: 'application/json'
      });
    }

    const response = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    const rawContentType = response.headers.get('content-type') || 'text/html; charset=utf-8';

    if (rawContentType.includes('text/html')) {
      let html = await response.text();

      // Inject base href tag so relative links, images, styles load from origin
      const baseTag = `<base href="${parsedUrl.href}">`;

      // Helper script to intercept link clicks and proxy internal links
      const injectionScript = `
        <script>
          (function() {
            // Inform parent sidecar of title and URL
            try {
              window.parent.postMessage({
                type: 'browser:navigated',
                url: ${JSON.stringify(parsedUrl.href)},
                title: document.title || ${JSON.stringify(parsedUrl.hostname)}
              }, '*');
            } catch(e) {}

            // Prevent frame-busting scripts safely
            try {
              Object.defineProperty(window, 'top', { get: () => window.self });
              Object.defineProperty(window, 'parent', { get: () => window.self });
            } catch(e) {}

            // Intercept link clicks so navigation stays inside the in-app browser
            document.addEventListener('click', function(e) {
              const a = e.target && e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({
                  type: 'browser:navigate-request',
                  url: a.href
                }, '*');
              }
            }, true);
          })();
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${injectionScript}`);
      } else if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}${injectionScript}`);
      } else {
        html = `${baseTag}${injectionScript}${html}`;
      }

      return new Response(html, {
        contentType: 'text/html; charset=utf-8',
        headers: {
          'Cache-Control': 'no-cache, no-store'
        }
      });
    } else {
      // Non-HTML content (images, json, styles, scripts)
      const arrayBuf = await response.arrayBuffer();
      return new Response(Buffer.from(arrayBuf), {
        contentType: rawContentType,
        headers: {
          'Cache-Control': 'no-cache, no-store'
        }
      });
    }
  } catch (err) {
    return new Response(
      `<html><body style="font-family:system-ui;padding:24px;color:#c00;background:#fff8f8;">` +
      `<h3>Proxy Fetch Error</h3><p>${err.message}</p>` +
      `<p style="color:#666;">Target: <code>${targetUrl}</code></p></body></html>`,
      {
        status: 502,
        contentType: 'text/html; charset=utf-8'
      }
    );
  }
}, 'GET');

app.run();
