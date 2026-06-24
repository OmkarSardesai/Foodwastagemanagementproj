# Food Wastage Management Project — Deploy notes

Quick steps to deploy on Render (recommended) or run locally.

Render (recommended)
- Push changes to your repository. Render will detect `render.yaml` and use it.
- If creating the service manually, set:
  - Build command: `npm --prefix backend install`
  - Start command: `node backend/server.js`
  - Add environment variables (recommended): `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, and `PORT` if desired.

Client configuration (API base URL)
- The client now auto-selects the API base URL:
  - `http://localhost:5000` when running locally (hostname `localhost`)
  - `window.API_BASE_OVERRIDE` if you inject it in your HTML (useful when frontend hosted separately)
  - otherwise `window.location.origin` (works when backend serves static files)

Example: to force the client to use your Render app URL, add this near the top of `index.html` (before `script.js`):
```html
<script>window.API_BASE_OVERRIDE = 'https://your-service-name.onrender.com';</script>
<script src="script.js"></script>
```

Replace `https://your-service-name.onrender.com` with the URL shown in your Render dashboard after deployment.

Local testing
```bash
# install backend deps
npm --prefix backend install

# start backend (or use `npm --prefix backend start`)
node backend/server.js
```

Notes
- `backend/server.js` now reads database credentials from environment variables with sensible defaults.
- You can review startup configuration in `render.yaml` or `Procfile`.
Food Wastage Management - Small demo

Quick start

1. Install dependencies:

```bash
npm init -y
npm install express mysql2 cors
```

2. Configure MySQL and create database `food_waste_proj`.
3. Start backend (serves frontend from `/public`):

```bash
cd backend
npm install
node server.js
```

4. Open http://localhost:5000 in your browser (or the host/port provided by your cloud provider).

Pushing to GitHub

- Initialize git, add files, commit, then create a remote and push. See commands below.
