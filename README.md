# Ayden AI

Ayden uses the clean black/white UI from the original Ayden design, with subtle purple accents, plus real accounts, server-side AI, persistent chats, and automatic chat naming.

## Run locally

1. Copy `.env.example` to `.env`.
2. Fill in the AI settings.
3. Double-click `start-ayden.bat`, or run `npm install` then `npm start`.
4. Open http://localhost:3000.

Do not upload `.env` or the `data/` folder to GitHub.

## Deployment

Deploy the Node app to a Node-capable host such as Render. GitHub Pages alone cannot run the login/session backend or safely hold the AI API key.
