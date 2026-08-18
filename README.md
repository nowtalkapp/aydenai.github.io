# Ayden

A clean, simple AI chat UI designed for GitHub Pages.

## GitHub Pages

1. Put the contents of this folder in your GitHub repository.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select your main branch and `/ (root)`.
4. Open the published site.
5. Open **Settings** inside Ayden and add your API key.

## AI setup

The site uses an OpenAI-compatible chat-completions endpoint directly from the browser.

The default preset is Groq:

- API URL: `https://api.groq.com/openai/v1/chat/completions`
- Model: `llama-3.1-8b-instant`

You can also use another OpenAI-compatible provider if it supports browser CORS requests.

### Important

A static GitHub Pages site cannot keep a secret API key on a server. The key entered in Ayden is stored only in the browser's local storage and is sent directly to the API provider.

For a public production AI app, use a small backend/serverless function so the provider key is never exposed to visitors.
