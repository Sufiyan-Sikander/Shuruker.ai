# ShurukerAi

This repository now contains a React frontend in `react-frontend/` and a Flask backend/API in `web.py` and `main.py`. The React app mirrors the old Flask UI flow while keeping the backend responsibilities in Flask.

## What I added
- `react-frontend/` — React/Vite frontend for the user-facing pages
- `web.py` — Flask backend, auth/session layer, and API routes
- `main.py` — RAG engine and Gemini/Pinecone integration
- `static/` — shared assets used by the frontend and a few legacy helper scripts

## Run locally
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the Flask backend:
   ```bash
   python web.py
   ```
3. In a second terminal, run the React frontend from `react-frontend/`:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser.

## Notes
- `web.py` redirects the old page routes to the React frontend and keeps the API/auth endpoints in Flask.
- `main.py` can still be run directly for RAG indexing or testing, but the web app imports it only for the backend model helpers it needs.

---

If you want, I can also remove the remaining legacy `static/` helper files and fully relocate those assets into the React app.
