# Holistic Health

A full-stack CSS 497 capstone project for discovering evidence-aware natural remedies, saving favorite compounds, and checking saved medications for known remedy interactions.

## What The App Does

- Search natural compounds by symptom, herb, compound name, category, or related ailment.
- Rank results with weighted text matching, fuzzy matching, and evidence-tier tie breaking.
- Show remedy detail pages with descriptions, evidence tier, source URL, and linked ailments.
- Register and log in with JWT-backed authentication.
- Save remedies to a personal dashboard.
- Maintain a medication list and check remedy detail pages for known interactions.
- Seed curated compounds, ailments, medication catalog entries, sources, and interaction records.

## Architecture

The repository is a small monorepo with two apps:

- `client/`: React 19, Vite, React Router, Tailwind CSS, and lucide-react icons.
- `server/`: Express 5, PostgreSQL, JWT auth, route validation, and seed scripts.

High-level search flow:

1. A user submits a query in the React UI.
2. The client calls `GET /api/search?q=...`.
3. The API loads compounds and compound-ailment rows from PostgreSQL.
4. `server/utils/search.js` scores each compound.
5. The API returns the top 10 ranked results with a computed `score`.

Interaction-check flow:

1. A signed-in user saves medications from the dashboard.
2. The detail page fetches saved medication IDs.
3. The client calls `GET /api/interactions?compound=<id>&medications=<ids>`.
4. The API loads direct compound-medication interaction edges and returns matching conflicts sorted by severity.

## Repository Structure

```text
holistic-health/
  client/
    public/
    src/
      components/
        Nav.jsx
      pages/
        Dashboard.jsx
        Landing.jsx
        Login.jsx
        Register.jsx
        RemedyDetail.jsx
        SearchResults.jsx
      App.jsx
      index.css
      main.jsx
    package.json
    vite.config.js
  server/
    db/
      index.js
      migrate.js
      schema.sql
    middleware/
      requireAuth.js
    routes/
      auth.js
      bookmarks.js
      compounds.js
      interactions.js
      medications.js
      search.js
      users.js
    scripts/
      fetchNCCIH.js
      fetchPubMed.js
      fetchUSDA.js
      runAllPipelines.js
      seedAdmin.js
      seedAilments.js
      seedManual.js
    tests/
      integration/
      unit/
    utils/
      graph.js
      search.js
    index.js
    package.json
  BUG_FIXES.txt
  README.md
```

## Requirements

- Node.js compatible with the installed dependencies.
- PostgreSQL database reachable by `DATABASE_URL`.
- Optional USDA FoodData Central API key for USDA ingestion.

## Environment Variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=<long_random_secret>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=7
REFRESH_TOKEN_HASH_SECRET=<optional_dedicated_refresh_hash_secret>
PORT=8080
CLIENT_URL=http://localhost:5173
USDA_API_KEY=<optional_usda_api_key>
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8080
```

Notes:

- `JWT_SECRET` is required for access JWT signing and protected routes.
- `ACCESS_TOKEN_EXPIRES_IN` defaults to `15m`.
- `REFRESH_TOKEN_TTL_DAYS` defaults to `7`.
- `REFRESH_TOKEN_HASH_SECRET` defaults to `JWT_SECRET`; set it separately in production to isolate refresh-token hash storage from JWT signing.
- `USDA_API_KEY` is required only for `npm run seed:usda` or the full pipeline.
- `CLIENT_URL` is optional, but useful when the frontend runs on a non-default local URL.

## Install

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

## Database Setup

Apply the schema:

```bash
cd server
npm run migrate
```

Seed the stable local dataset:

```bash
npm run seed:manual
npm run seed:ailments
node scripts/fetchNCCIH.js
npm run seed:admin
```

Optional external-data enrichment:

```bash
npm run seed:usda
node scripts/fetchPubMed.js
```

Full pipeline:

```bash
npm run seed:all
```

## Run Locally

Start the backend:

```bash
cd server
npm start
```

Verify backend health:

```bash
curl http://localhost:8080/health
```

Start the frontend:

```bash
cd client
npm run dev
```

Open the Vite URL shown in the terminal, typically `http://localhost:5173`.

## API Summary

Health:

- `GET /health`: returns `{ "status": "ok" }`.

Auth:

- `POST /api/auth/register`: creates a user and returns `{ accessToken, token, refreshToken, refreshTokenExpiresAt, user }`.
- `POST /api/auth/login`: authenticates a user and returns `{ accessToken, token, refreshToken, refreshTokenExpiresAt, user }`.
- `POST /api/auth/refresh`: rotates a valid refresh token and returns a new access/refresh token pair.
- `POST /api/auth/logout`: revokes the submitted refresh token.

Auth notes:

- `token` is a backwards-compatible alias for `accessToken`.
- Refresh tokens are opaque random strings, stored only as HMAC-SHA-256 hashes in PostgreSQL.
- Rotated refresh tokens are marked used. Reusing a used token revokes the full token family and requires a fresh login.

Search and compounds:

- `GET /api/search?q=...`: returns ranked compound results. `q` is required and capped at 200 characters.
- `GET /api/search/ailments`: returns ailment categories sorted by name.
- `GET /api/compounds/:id`: returns a compound plus linked ailments.

Bookmarks:

- `GET /api/bookmarks`: returns the signed-in user's saved remedies.
- `POST /api/bookmarks`: saves `{ compoundId }`.
- `DELETE /api/bookmarks/:compoundId`: removes a saved remedy.

Medications and interactions:

- `GET /api/medications`: returns the searchable medication catalog.
- `GET /api/medications/mine`: returns the signed-in user's medications.
- `POST /api/medications/mine`: replaces the signed-in user's medication IDs with `{ medication_ids: number[] }`.
- `GET /api/interactions?compound=<id>&medications=<id1>,<id2>`: returns conflicts for a compound and medication list.

## Testing And Verification

Frontend lint:

```bash
cd client
npm run lint
```

Frontend production build:

```bash
cd client
npm run build
```

Backend unit tests:

```bash
cd server
npm test -- --runTestsByPath tests/unit/search.test.js
```

Refresh-token focused tests:

```bash
cd server
npm test -- --runTestsByPath tests/unit/tokens.test.js tests/integration/auth.refresh.test.js
```

All backend tests:

```bash
cd server
npm test
```

Integration test notes:

- `server/tests/integration/search.routes.test.js` requires a migrated and seeded PostgreSQL database.
- Run `npm run migrate`, `npm run seed:manual`, and `npm run seed:ailments` before the full backend suite.
- Tests import `server/index.js` without starting the HTTP listener; Supertest drives the Express app directly.

Manual smoke checklist:

1. Open the landing page and search for `insomnia`.
2. Confirm the search box stays a stable width for long query text.
3. Confirm pages do not show extra side scrollbars.
4. Sort results by relevance, evidence tier, and A-Z.
5. Open a remedy detail page and verify source/evidence information.
6. Register or log in, save a remedy, and verify it appears on the dashboard.
7. Add a medication such as `Ibuprofen` or `Tylenol` from the dashboard.
8. Open a remedy detail page and verify interaction messaging renders.

## Design And Implementation Notes

- Search scoring is centralized in `server/utils/search.js` so relevance behavior is testable without HTTP or DB concerns.
- Route handlers validate IDs and query inputs before hitting the database.
- Medication saves are transactional so a failed update does not partially clear a user's saved list.
- The auth rate limiter is mounted directly on `/api/auth`.
- Refresh tokens use opaque token families, single-use rotation, hashed storage, and family revocation when reuse is detected.
- Frontend page components keep helpers local to avoid adding shared files unless the project needs them.
- Tailwind utility classes are used consistently with the existing visual style.

## Known Limitations

- Frontend automated tests are not currently included.
- Interaction data is curated and direct-edge based; it is not a substitute for medical advice.
- External data scripts depend on third-party API availability and configured API keys.

## Bug Notes

See `BUG_FIXES.txt` for the resolved bug-list items from the cleanup pass.
