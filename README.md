# Ayden

ChatGPT-style minimal UI for GitHub Pages.

- Sign up / log in (first name, last name, email, password, birthday) — stored in browser only
- Settings: theme (dark/light), API key, log out
- Talks to Groq (or any OpenAI-compatible API) with the chill texting personality

## Deploy

1. Upload `index.html`, `styles.css`, `script.js` to your repo root.
2. Settings → Pages → Deploy from branch → root.
3. Open the site → create an account → Settings → paste Groq key → Save.

Free key: https://console.groq.com/keys  
Default model: `openai/gpt-oss-20b`

This is client-side only. Not real secure auth — fine for a personal demo.
