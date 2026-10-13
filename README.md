# Antigravity In-App Browser Plugin

A fast, responsive, and full-featured **In-App Browser extension** designed specifically for **Antigravity 2.0**. Preview local web development servers, inspect responsive layouts on simulated mobile/tablet devices, and browse web documentation right in the Antigravity auxiliary side pane.

---

## ✨ Features

- **⚡ Local Dev Server Discovery**: Automatically probes common localhost ports (`3000`, `5173`, `8000`, `8080`, `4321`, `8501`, etc.) and surfaces live servers with one-click preview buttons.
- **📱 Responsive Viewport Simulation**: Easily switch between **Responsive (100%)**, **Desktop (1280px)**, **Tablet (768px)**, and **Mobile (iPhone SE 375px, iPhone Pro 390px)** viewports with orientation rotation (portrait ↔ landscape).
- **🛡️ Smart Proxy Framing**: Seamlessly toggle between **Direct Embed** (optimal for localhost servers with hot module reloading) and **Proxy Mode** (strips `X-Frame-Options` and restrictive `Content-Security-Policy` headers so external sites can be browsed in-app).
- **🤖 Deep AI Agent Integration**: Send the current page context, URL, and pre-built engineering prompts directly to your Antigravity conversation (for debugging, UI/UX critique, performance audits, or automated test generation).
- **⭐ Bookmarks & History**: Save frequently visited web apps and docs, quick-launch from the top bookmarks strip, and view recent history.
- **🔗 Deep Linking**: Open any URL instantly from chat or scripts using the `sidecar://` link scheme:
  ```markdown
  [Open Preview](sidecar://browser/panel/?url=http%3A%2F%2Flocalhost%3A5173)
  ```

---

## 📁 Plugin Structure

```text
~/.gemini/config/plugins/browser/
├── plugin.json               # Plugin metadata & suggested prompts
├── README.md                 # Documentation
├── assets/
│   └── logo.svg              # Browser plugin icon
├── rules/
│   └── AGENTS.md             # Agent auto-linking rules
├── skills/
│   └── browser/
│       └── SKILL.md          # Skill definition & agent capabilities
└── sidecars/
    └── panel/
        ├── sidecar.json      # Sidecar process & aux pane manifest
        ├── package.json      # Node.js ES module configuration
        ├── main.mjs          # Sidecar backend & Smart Proxy service
        ├── index.html        # Browser UI markup
        ├── app.js            # Frontend logic & window.sidecar bridge
        └── styles.css        # Antigravity theme-aware styling
```

---

## 🚀 How to Enable and Open in Antigravity 2.0

1. Open **Antigravity 2.0**.
2. Navigate to the **Customizations** page in the left sidebar and select the **Installed** tab.
3. Locate **Browser** and click **Enable**. The background sidecar starts automatically.
4. Open any conversation, click the **⋮** (three-dot) menu in the top right, and choose **Browser** from the **Extensions** menu to open it in the side pane.
5. Alternatively, click any sidecar link in chat:
   ```markdown
   [Open Browser](sidecar://browser/panel/)
   ```
