# Refboard
FigJam-style visual research board. Single static file (`index.html`), no build step.

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000

## Deploy to GitHub Pages
1. Create an empty repo on GitHub (e.g. `refboard`).
2. In this folder: `git init -b main && git add . && git commit -m "Initial commit" && git remote add origin https://github.com/<you>/refboard.git && git push -u origin main`
3. Repo Settings → Pages → Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes on every push.
4. Site URL: `https://<you>.github.io/refboard/`

## Image import
- Wikimedia Commons: works with no key.
- Unsplash / Pexels / Pixabay: paste your own API key in the Import panel (stored in your browser only). Follow each provider's attribution rules.
- Pinterest, Behance, Dribbble: no public search API. The panel opens their search pages; drag or paste images back.
- Data is stored in browser localStorage (about 5 MB). Cloud sync (Supabase) is not implemented.
