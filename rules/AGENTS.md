# Browser Preview in Side Panel

Whenever you start a local development server (e.g., Vite, Next.js, Express, Flask, FastAPI, Hugo, Streamlit, etc.), build a web application, generate an HTML file, or reference a web URL:

1. **Always provide a clickable link to open the preview directly in the side panel** using the `sidecar://` scheme:
   ```markdown
   [Open <label> in Side Panel](sidecar://browser/panel/?url=<encoded_url>)
   ```
   *(Pass the target URL in the `?url=` query parameter. If the URL contains characters like `:`, `/`, `?`, or `&`, URL-encode them — e.g. `http%3A%2F%2Flocalhost%3A3000` — so markdown parsers do not truncate the link).*

2. **Examples**:
   - For a local dev server on port 3000:
     `[Open localhost:3000 in Side Panel](sidecar://browser/panel/?url=http%3A%2F%2Flocalhost%3A3000)`
   - For a local dev server on port 5173:
     `[Open localhost:5173 in Side Panel](sidecar://browser/panel/?url=http%3A%2F%2Flocalhost%3A5173)`
   - For opening the browser dashboard:
     `[Open Browser](sidecar://browser/panel/)`

3. **Display this link prominently** in your response right after launching a server or recommending the user view a web application, allowing them to preview and interact with the page inside the Antigravity side pane immediately.
