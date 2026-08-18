# Ayden

ChatGPT-style minimal UI for GitHub Pages.

## Setup (important)

1. Open **`config.js`**
2. Paste your Groq API key into `API_KEY`
3. Edit `SYSTEM_PROMPT` if you want a different personality for **everyone**
4. Upload all 4 files: `index.html`, `styles.css`, `script.js`, `config.js`

Free key: https://console.groq.com/keys  
Default model: `openai/gpt-oss-20b`

## Features

- Sign up / log in (name, email, password, birthday) — stays logged in on refresh
- Chat history saved per account (browser only)
- Collapsible black sidebar
- Settings: theme + log out
- API key & personality live in `config.js` (same for all visitors)

## Note

This is 100% client-side. The API key in `config.js` is visible to anyone who views page source. Use a free-tier key only.
