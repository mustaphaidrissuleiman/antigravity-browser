---
name: browser
description: Open, preview, and interact with web applications, local development servers (localhost), and online web documentation directly in the Antigravity side panel. Trigger when the user asks to preview a web app, open a website, check a running dev server, or launch the browser.
---

# Browser for Antigravity

The **Browser** plugin allows users to preview and test web applications, inspect localhost dev servers (such as Vite, Next.js, Express, Flask, Streamlit), and browse documentation without leaving the Antigravity IDE.

## Triggering the Browser

Whenever the user asks to open, preview, or view a URL, website, or local dev server in the side panel:

1. **Surface a clickable pill link** using the `sidecar://` scheme:
   - For a specific URL:
     `[Open <URL/Port> in Side Panel](sidecar://browser/panel/?url=<encoded_url>)`
     *(Make sure the URL is properly URL-encoded, e.g. `http%3A%2F%2Flocalhost%3A5173`)*
   - For launching the browser homepage / dashboard:
     `[Open Browser](sidecar://browser/panel/)`

2. **Features available in the Browser**:
   - **Localhost Dev Server Auto-Discovery**: Detects active listeners on standard ports (`3000`, `5173`, `8000`, `8080`, `4321`, `8501`, etc.).
   - **Responsive Viewport Switcher**: Quickly switch between Full Width, Desktop (1280px), Tablet (768px), and Mobile (375px / 390px) with portrait/landscape rotation.
   - **Smart Proxy Framing**: Strips blocking `X-Frame-Options` and `Content-Security-Policy` headers for external sites that forbid direct iframe embedding.
   - **Bookmarks & History**: Save quick links and access recent pages.
   - **Ask Agent**: Send context, page URLs, and debugging requests directly into the active conversation.
