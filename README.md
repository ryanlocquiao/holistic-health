# Holistic Health

A full-stack Capstone project for CSS497 focused on discoverability of evidence-based natural remedies for common symptoms and health concerns.

## Capstone Context (CSS497)

This project is designed as a practical software engineering capstone that demonstrates:

- End-to-end product development (UI, API, and database).
- Data modeling and relational schema design.
- Search relevance logic using weighted ranking and fuzzy matching.
- Clean architecture and modular code organization.
- Production-minded implementation patterns (error handling, validation, and environment-driven configuration).

The application objective is to help users explore natural compounds by symptom, then review compound detail, evidence tier, and source context in a clear and usable interface.

## Problem Statement

People searching for natural remedies often find fragmented, low-context, or non-curated data. This project provides a structured interface where users can:

- Search by symptom or health concern.
- See ranked compound recommendations.
- Review details (category, evidence tier, source, associated ailments).

## Key Features

- Search by free-text query with weighted relevance scoring.
- Fuzzy matching (Levenshtein distance) for typo tolerance.
- Ranking strategy that prioritizes direct name and ailment matches.
- Dedicated detail page for each compound.
- Evidence tier metadata to support interpretation.
- Database seed pipelines:
	- Curated manual dataset.
	- USDA ingestion pipeline.
	- Ailment-to-compound relationship seeding.

## System Architecture

The project is split into two applications:

- client: React + Vite SPA.
- server: Express API + PostgreSQL.

### High-level Request Flow

1. User submits a query from the landing page.
2. Frontend calls GET /api/search?q=... .
3. API loads compounds and compound-ailment links.
4. Search utility scores each compound.
5. Top results are returned and displayed.
6. User selects a result and opens GET /api/compounds/:id detail data.

## Repository Structure

```text
holistic-health/
	client/                  # React frontend
		src/
			pages/
				Landing.jsx
				SearchResults.jsx
				RemedyDetail.jsx
	server/                  # Express backend
		db/
			schema.sql
			migrate.js
			index.js
		routes/
			search.js
			compounds.js
		scripts/
			fetchUSDA.js
			seedManual.js
			seedAilments.js
		utils/
			search.js
```

## Technology Stack

### Frontend

- React 19
- React Router 7
- Vite 8
- Tailwind CSS

### Backend

- Node.js
- Express 5
- PostgreSQL (pg)
- dotenv
- node-fetch
- p-queue

## Required Dependencies

This project uses Node.js package dependencies in both the `server` and `client` apps.

### Runtime Prerequisites

- Node.js 18+ (recommended LTS)
- npm 9+
- PostgreSQL 14+ (or compatible managed PostgreSQL)

### Backend Dependencies (`server/package.json`)

- cors@^2.8.6
- dotenv@^17.4.0
- express@^5.2.1
- node-fetch@^2.7.0
- p-queue@^9.1.2
- pg@^8.20.0

Install backend dependencies:

```bash
cd server
npm install
```

Install backend dependencies explicitly:

```bash
cd server
npm install cors@^2.8.6 dotenv@^17.4.0 express@^5.2.1 node-fetch@^2.7.0 p-queue@^9.1.2 pg@^8.20.0
```

### Frontend Dependencies (`client/package.json`)

Production dependencies:

- lucide-react@^1.8.0
- react@^19.2.5
- react-dom@^19.2.5
- react-router-dom@^7.14.2

Development dependencies:

- @eslint/js@^9.39.4
- @types/react@^19.2.14
- @types/react-dom@^19.2.3
- @vitejs/plugin-react@^6.0.1
- autoprefixer@^10.4.27
- eslint@^9.39.4
- eslint-plugin-react-hooks@^7.0.1
- eslint-plugin-react-refresh@^0.5.2
- globals@^17.4.0
- postcss@^8.5.8
- tailwindcss@^3.4.19
- vite@^8.0.1

Install frontend dependencies:

```bash
cd client
npm install
```

Install frontend dependencies explicitly:

```bash
cd client
npm install lucide-react@^1.8.0 react@^19.2.5 react-dom@^19.2.5 react-router-dom@^7.14.2
npm install -D @eslint/js@^9.39.4 @types/react@^19.2.14 @types/react-dom@^19.2.3 @vitejs/plugin-react@^6.0.1 autoprefixer@^10.5.0 eslint@^9.39.4 eslint-plugin-react-hooks@^7.1.1 eslint-plugin-react-refresh@^0.5.2 globals@^17.5.0 postcss@^8.5.10 tailwindcss@^3.4.19 vite@^8.0.9
```

## Data Model Overview

Core entities in the relational schema:

- compounds: Natural remedies and their metadata.
- ailments: Searchable symptom/condition categories.
- compound_ailments: Join table linking compounds to ailments.

Planned/extended entities also included in schema:

- users
- medications
- user_medications
- interactions
- sources

This supports current search/discovery features and future contraindication workflows.

## Search Design

Search behavior is implemented in server/utils/search.js with weighted scoring:

- Exact compound name match receives the highest weight.
- Partial text matches add medium weight.
- Fuzzy matching (Levenshtein distance <= 2) adds tolerance for misspellings.
- Ailment matches strongly affect ranking.
- Description/category matches add contextual weight.
- Evidence tier contributes a small tie-breaking influence.

The endpoint returns top ranked results (currently capped at 10).

## API Endpoints

### Health

- GET /health
- Response: { "status": "ok" }

### Search Compounds

- GET /api/search?q=insomnia
- Validations:
	- q required
	- q length <= 200
- Response: ranked compound list with score

### List Ailments

- GET /api/search/ailments
- Response: all ailment categories ordered by name

### Compound Detail

- GET /api/compounds/:id
- Validations:
	- id must be a positive integer
- Response: compound metadata + linked ailments

## Environment Variables

Create a .env file in server/ with:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
PORT=8080
USDA_API_KEY=<your_usda_api_key>
```

Create a .env file in client/ with:

```env
VITE_API_URL=http://localhost:8080
```

Notes:

- USDA_API_KEY is required only for USDA seed ingestion.
- CORS is configured in the backend for local Vite dev and the deployed frontend domain.

## Local Setup and Run

### 1) Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2) Initialize database schema

```bash
cd server
npm run migrate
```

### 3) Seed data (recommended order)

```bash
npm run seed:manual
npm run seed:ailments
# optional
npm run seed:usda
```

### 4) Start backend

```bash
cd server
npm start
```

### 5) Start frontend

```bash
cd client
npm run dev
```

Open the Vite URL shown in terminal (typically http://localhost:5173).

## Testing and Verification

This project currently uses runtime smoke testing and endpoint verification.

### Manual smoke test checklist

1. Start backend and verify GET /health.
2. Search from the landing page (for example: insomnia).
3. Confirm ranked results appear.
4. Open a detail page and verify ailment list, evidence tier, and source URL.
5. Verify validation errors:
	 - GET /api/search without q returns an error.
	 - GET /api/compounds/abc returns an error.

### Example API checks (PowerShell)

```powershell
$base = 'http://localhost:8080'
Invoke-RestMethod -Uri "$base/health"
Invoke-RestMethod -Uri "$base/api/search?q=insomnia"
Invoke-RestMethod -Uri "$base/api/search/ailments"
Invoke-RestMethod -Uri "$base/api/compounds/32"
```

## Design Decisions and Engineering Rationale

- Monorepo layout: simplifies coordination across frontend and backend for a capstone-scale project.
- Relational schema first: supports clear relationships and future expansion for contraindication logic.
- Server-side ranking: keeps search logic centralized and reusable.
- Explicit route-level validation: avoids unnecessary DB work and improves reliability.
- Modular scripts for migration/seeding: supports repeatable environment setup for demos and grading.

## Current Limitations

- No authentication flow wired into the active UI yet.
- No contraindication engine implemented in current release.
- Test suite is manual/smoke-based; automated integration tests are a next milestone.
- Search ranking is static-weighted (not personalized or ML-based).

## Future Enhancements

- Add login and user profile management.
- Implement medication contraindication checks using interactions table.
- Add saved remedies and history.
- Add automated test coverage (API + UI).
- Add pagination/filtering and richer source citations.

## Deployment Notes

- Frontend is configured for deployment on Vercel.
- Backend CORS allows:
	- http://localhost:5173
	- https://my-holistic-health.vercel.app
- Use managed PostgreSQL for production and set DATABASE_URL securely.

## Course Deliverable Alignment (CSS497)

This repository demonstrates capstone outcomes through:

- Requirements-driven feature implementation.
- Full-stack integration and API contract design.
- Database schema design and relationship modeling.
- Search algorithm implementation and relevance tuning.
- Deployment-aware configuration and runtime validation.
- Clear technical documentation for reproducibility.