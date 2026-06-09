# Holistic Health

A full-stack Capstone project for CSS497 focused on discoverability of evidence-based natural remedies for common symptoms and health concerns.

## Capstone Context (CSS497)

This project demonstrates:

- End-to-end product development (UI, API, and database).
- Data modeling and relational schema design.
- Search relevance logic using weighted ranking and fuzzy matching.
- Clean architecture and modular code organization.
- Production-minded implementation patterns (error handling, validation, and environment-driven configuration).

The application helps users explore natural compounds by symptom, review compound detail, evidence tier, and source context.

## Key Features

- Free-text search with weighted relevance scoring and typo tolerance.
- Fuzzy matching (Levenshtein distance) for misspellings.
- Ranking that prioritizes exact name and ailment matches with evidence-tier tie-breaking.
- Compound detail pages with category, evidence tier, source, and related ailments.
- Data ingestion and seeding pipelines (manual curation and USDA ingestion).

## System Architecture

The repository is a monorepo with two primary apps:

- `client/` — React 19 + Vite SPA (frontend UI, routing, and interactions).
- `server/` — Express 5 API (routes, validation, DB access, search utilities, and seed scripts).

High-level request flow:

1. User submits a query on the frontend.
2. Frontend calls `GET /api/search?q=...` on the backend.
3. Backend loads compounds and `compound_ailments` links from the DB.
4. `server/utils/search.js` scores each compound using weighted and fuzzy matching.
5. Top ranked results (cap 10) are returned to the client.

## Repository Structure

```text
holistic-health/
	client/                  # React frontend
		public/
		src/
			App.jsx
			main.jsx
			index.css
			components/
				Nav.jsx
			pages/
				Landing.jsx
				SearchResults.jsx
				RemedyDetail.jsx
	server/                  # Express backend
		db/
			schema.sql
			migrate.js
			index.js
		middleware/
			requireAuth.js
		routes/
			search.js
			compounds.js
			auth.js
			users.js
			medications.js
			bookmarks.js
			interactions.js
		scripts/
			fetchUSDA.js
			fetchPubMed.js
			runAllPipelines.js
			seedAdmin.js
			seedAilments.js
			seedManual.js
		utils/
			search.js
			graph.js
		index.js
		package.json
	README.md
	BUG_FIXES.txt
```

## Technology Stack

- Frontend: React 19, React Router 7, Vite 8, Tailwind CSS
- Backend: Node.js, Express 5, PostgreSQL

## Dependencies
# Holistic Health

A full-stack Capstone project for CSS497 focused on discoverability of evidence-based natural remedies for common symptoms and health concerns.

## Capstone Context (CSS497)

This project demonstrates:

- End-to-end product development (UI, API, and database).
- Data modeling and relational schema design.
- Search relevance logic using weighted ranking and fuzzy matching.
- Clean architecture and modular code organization.
- Production-minded implementation patterns (error handling, validation, and environment-driven configuration).

The application helps users explore natural compounds by symptom, review compound detail, evidence tier, and source context.

## Key Features

- Free-text search with weighted relevance scoring and typo tolerance.
- Fuzzy matching (Levenshtein distance) for misspellings.
- Ranking that prioritizes exact name and ailment matches with evidence-tier tie-breaking.
- Compound detail pages with category, evidence tier, source, and related ailments.
- Data ingestion and seeding pipelines (manual curation and USDA ingestion).

## System Architecture

The repository is a monorepo with two primary apps:

- `client/` — React 19 + Vite SPA (frontend UI, routing, and interactions).
- `server/` — Express 5 API (routes, validation, DB access, search utilities, and seed scripts).

High-level request flow:

1. User submits a query on the frontend.
2. Frontend calls `GET /api/search?q=...` on the backend.
3. Backend loads compounds and `compound_ailments` links from the DB.
4. `server/utils/search.js` scores each compound using weighted and fuzzy matching.
5. Top ranked results (cap 10) are returned to the client.

## Repository Structure

```text
holistic-health/
	client/                  # React frontend
		public/
		src/
			App.jsx
			main.jsx
			index.css
			components/
				Nav.jsx
			pages/
				Landing.jsx
				SearchResults.jsx
				RemedyDetail.jsx
	server/                  # Express backend
		db/
			schema.sql
			migrate.js
			index.js
		middleware/
			requireAuth.js
		routes/
			search.js
			compounds.js
			auth.js
			users.js
			medications.js
			bookmarks.js
			interactions.js
		scripts/
			fetchUSDA.js
			fetchPubMed.js
			runAllPipelines.js
			seedAdmin.js
			seedAilments.js
			seedManual.js
		utils/
			search.js
			graph.js
		index.js
		package.json
	README.md
	BUG_FIXES.txt
```

## Technology Stack

- Frontend: React 19, React Router 7, Vite 8, Tailwind CSS
- Backend: Node.js, Express 5, PostgreSQL

## Dependencies

This section lists the actual runtime and development packages used by each app (pulled from `package.json`).

**Server (`server/package.json`) — runtime dependencies:**

- `bcrypt` ^6.0.0
- `cors` ^2.8.6
- `dotenv` ^17.4.0
- `express` ^5.2.1
- `express-rate-limit` ^8.5.2
- `express-validator` ^7.3.2
- `helmet` ^8.2.0
- `jsonwebtoken` ^9.0.3
- `node-fetch` ^2.7.0
- `p-queue` ^9.1.2
- `pg` ^8.20.0

**Server — devDependencies:**

- `jest` ^30.3.0 (test runner)
- `supertest` ^7.2.2 (HTTP assertions)

Install backend dependencies:

```bash
cd server
npm install
```

**Client (`client/package.json`) — production dependencies:**

- `lucide-react` ^1.8.0
- `react` ^19.2.5
- `react-dom` ^19.2.5
- `react-router-dom` ^7.14.2

**Client — devDependencies:**

- `@eslint/js` ^9.39.4
- `@types/react` ^19.2.14
- `@types/react-dom` ^19.2.3
- `@vitejs/plugin-react` ^6.0.1
- `autoprefixer` ^10.5.0
- `eslint` ^9.39.4
- `eslint-plugin-react-hooks` ^7.1.1
- `eslint-plugin-react-refresh` ^0.5.2
- `globals` ^17.5.0
- `postcss` ^8.5.10
- `tailwindcss` ^3.4.19
- `vite` ^8.0.9

Install frontend dependencies:

```bash
cd client
npm install
```

## Data Model Overview

Core entities in the relational schema:

- `compounds` — remedies and metadata
- `ailments` — searchable categories
- `compound_ailments` — join table linking compounds to ailments

Planned/extended entities (present in schema.sql and referenced by migrations): `users`, `medications`, `user_medications`, `interactions`, `sources`.

## Search Design

Search scoring lives in `server/utils/search.js`. Key behaviors:

- Exact name matches receive top weight.
- Partial and description/category text matches add medium weight.
- Ailment matches give a strong boost to ranking.
- Fuzzy matching (Levenshtein distance <= 2) provides typo tolerance.
- Evidence tier is used as a small tie-breaker.
- Results are capped at 10 for broad queries.

## API Endpoints

**Health**

- `GET /health` — Response: `{ "status": "ok" }`

**Search Compounds**

- `GET /api/search?q=...` — Query validations: `q` required, max length 200. Returns ranked compound array with computed `score` field.

**List Ailments**

- `GET /api/search/ailments` — Returns ailment categories sorted by name.

**Compound Detail**

- `GET /api/compounds/:id` — `id` must be a positive integer; returns compound metadata plus linked ailments.

## Environment Variables

Create a `.env` file in `server/` with:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
PORT=8080
USDA_API_KEY=<your_usda_api_key>
```

Create a `.env` file in `client/` with:

```env
VITE_API_URL=http://localhost:8080
```

Notes:

- `USDA_API_KEY` is required only for USDA ingestion.
- CORS is configured for local Vite dev and the deployed frontend domain.

## Local Setup and Run

1) Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

2) Initialize database schema

```bash
cd server
npm run migrate
```

3) Seed data (recommended order)

```bash
npm run seed:manual
npm run seed:ailments
# optional: npm run seed:usda
```

4) Start backend

```bash
cd server
npm start
```

5) Start frontend

```bash
cd client
npm run dev
```

Open the Vite URL shown in terminal (typically http://localhost:5173).

## Testing and Verification

This repository includes both unit and integration tests for the backend. Tests are run with `jest` and use `supertest` for HTTP-layer assertions.

**How tests are organized**

- `server/tests/unit/search.test.js` — Unit tests for `searchCompounds` scoring logic (exact match, fuzzy match, ailment influence, evidence tier, score field presence, input trimming, immutability, and result capping).
- `server/tests/integration/search.routes.test.js` — Integration tests for `GET /api/search` and `GET /api/compounds/:id` (status codes, response shapes, validation errors). These tests assume the DB has been migrated and seeded.

**Run backend tests**

```bash
cd server
npm test
```

**Testing notes & methods**

- Unit tests exercise `server/utils/search.js` directly with mocked compound arrays and ailment maps to validate ranking logic independent of HTTP/DB layers.
- Integration tests start the Express app (via `server/index.js`) and use `supertest` to make requests against routes. These tests require a prepared DB (run `npm run migrate` and `npm run seed:manual` / `npm run seed:ailments`).
- Jest runs with the `node` test environment as configured in `server/package.json`.
- Tests that touch the DB close connections with `pool.end()` in `afterAll` hooks to avoid hanging test runners.

## Manual smoke test checklist

1. Start backend and verify `GET /health`.
2. Search from the landing page (e.g., `insomnia`).
3. Confirm ranked results appear and each item includes `score`.
4. Open a compound detail page and verify `ailments`, `evidence_tier`, and `source_url`.
5. Verify route validations:
	 - `GET /api/search` without `q` returns 400 with an error message.
	 - `GET /api/compounds/abc` returns 400 for invalid ID.

## Design Decisions and Engineering Rationale

- Monorepo layout simplifies coordination across frontend and backend for a capstone-scale project.
- Relational schema-first approach supports clear relationships and future contraindication logic.
- Server-side ranking centralizes search logic and makes it reusable across clients.
- Route-level validation and hardened middleware (`helmet`, `express-rate-limit`, `express-validator`) improve security and reliability.

## Current Limitations

- The active UI does not yet include a full authentication flow; some middleware and JWT components exist server-side for planned auth.
- No contraindication engine implemented yet.
- Frontend UI automated tests are not present; backend tests are the primary automated coverage.

## Future Enhancements

- Add login and user profile management (complete auth flow, client & server integration).
- Implement a contraindication/interaction engine using `interactions` and `medications` tables.
- Add frontend automated tests (Cypress or React Testing Library) and expand backend edge-case tests.
- Introduce pagination, filtering, and richer source citations.

## Deployment Notes

- Frontend set up for Vercel deployment; backend CORS allows `http://localhost:5173` and production frontend origins.
- Use managed PostgreSQL and set `DATABASE_URL` securely in production.

## Course Deliverable Alignment (CSS497)

This repository demonstrates capstone outcomes through:

- Requirements-driven feature implementation.
- Full-stack integration and API contract design.
- Database schema design and relationship modeling.
- Search algorithm implementation and relevance tuning.
- Deployment-aware configuration and runtime validation.
- Clear technical documentation for reproducibility.