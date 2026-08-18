# Ayden AI

This version adds real accounts, persistent chat history, server-side AI configuration, and automatic chat naming/summary.

## What is included

- Email + password accounts
- First name + last name
- Optional birthday
- Secure password hashing with Node's `scrypt`
- HttpOnly login sessions
- Persistent chats in SQLite
- New Chat creates another saved conversation
- Old conversations can be reopened from the sidebar
- After the second user message, Ayden asks the AI to create:
  - a short chat title based on what the user said
  - a one-sentence progress summary
- AI API URL, key, model, and personality prompt live in `.env`
- The browser never receives the API key

## Run it

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Put your real API key in `.env`.
4. Change `PASSWORD_SALT` to a long random string.
5. Run:

```bash
npm install
npm start
```

6. Open `http://localhost:3000`.

## Important GitHub Pages note

GitHub Pages can only host the static frontend. It cannot run `server.js`, SQLite, login sessions, or safely read `.env`.

So this architecture is:

**GitHub Pages / static host → Ayden frontend → your backend → AI provider**

For production, host `server.js` on a service that supports Node (or convert it to serverless functions), and point the frontend at that backend. Do not put the real `.env` or API key in a GitHub repository.

The supplied project is intentionally set up so the secret stays on the server.
