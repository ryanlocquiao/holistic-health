# Holistic Health

Holistic Health is a full-stack wellness discovery application for exploring natural remedies with evidence context, saving remedies for later, and checking them against a personal medication list.

The application is designed for education and discovery. It is not a substitute for medical advice, diagnosis, or treatment from a qualified healthcare professional.

## What The App Does

- Search natural compounds by symptom, condition, herb, compound name, category, or related ailment.
- Rank results with weighted text matching, fuzzy matching, and evidence-tier tie breaking.
- Browse remedy detail pages with descriptions, evidence tiers, source links, and related ailments.
- Create an account and sign in with JWT-backed authentication and rotating refresh tokens.
- Save remedies to a personal dashboard and remove them when they are no longer useful.
- Maintain a personal list of prescription and over-the-counter medications.
- Check a remedy against saved medications and display known interaction details ordered by severity.
- Get three profile-aware natural remedy recommendations from the Holistic Assistant.
- Record acknowledgement of the medical disclaimer for authenticated users and revisit it periodically for anonymous sessions.
- Change an account password from Profile Settings.
- Protect authentication and recommendation endpoints with rate limiting.

## How To Use It

### Explore remedies

1. Open the landing page and acknowledge the medical disclaimer.
2. Search for a symptom, condition, herb, or compound such as `insomnia`, `turmeric`, or `stress`.
3. Review the ranked results and sort them by relevance, evidence tier, or name.
4. Open a result to read its description, evidence information, linked ailments, and source material.

### Save remedies and check interactions

1. Register or log in.
2. Select the bookmark control on a remedy detail page.
3. Open **Dashboard** to review saved remedies.
4. Add medications by searching the medication catalog.
5. Open a saved or search result remedy to see whether it has known interactions with your medications.
6. Review the interaction severity and description, then consult a healthcare professional before using a remedy with medication.

### Get recommendations

1. Log in and open **Dashboard**.
2. Select **Get Recommendations** in the Holistic Assistant panel.
3. The assistant uses saved remedies and medications as profile context, avoids remedies already saved, and includes a reason and precaution for each result.
4. Recommendations are limited to three requests per hour by default.

### Manage your account

Use the account menu to open **Profile Settings**, where you can review your email address and change your password. Signing out clears the local session and returns you to the landing page.

## Technology

- **Client:** React 19, Vite, React Router, Tailwind CSS, and lucide-react.
- **Server:** Node.js, Express 5, PostgreSQL, bcrypt, JWT, Helmet, CORS, and express-validator.
- **Recommendation service:** Google Gemini through `@google/genai`.
- **Data pipelines:** Curated seed data plus optional USDA FoodData Central, PubMed, NCCIH-style interaction, and openFDA ingestion scripts.

## Requirements

- Node.js compatible with the installed dependencies.
- PostgreSQL accessible through `DATABASE_URL`.
- A Gemini API key for the Holistic Assistant.
- A USDA FoodData Central API key only when running the USDA ingestion script.

## Configuration

Create `server/.env` from `server/.env.example`:

```env
PORT=8080
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=<long_random_secret>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=7
REFRESH_TOKEN_HASH_SECRET=<optional_dedicated_refresh_hash_secret>
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=<google_gemini_api_key>
GEMINI_MODEL=gemini-3.5-flash
CHATBOT_RATE_LIMIT_WINDOW_MS=3600000
CHATBOT_RATE_LIMIT_MAX=3
USDA_API_KEY=<optional_usda_api_key>
OPENFDA_API_KEY=<optional_openfda_api_key>
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8080
```

`JWT_SECRET` and `DATABASE_URL` are required for the server. `GEMINI_API_KEY` is required for recommendations. `REFRESH_TOKEN_HASH_SECRET` defaults to `JWT_SECRET`, but should be set separately in production.

## Install

Install each application independently:

```bash
cd server
npm install

cd ../client
npm install
```

## Database Setup

Apply the PostgreSQL schema, then load the stable local dataset:

```bash
cd server
npm run migrate
npm run seed:manual
npm run seed:ailments
node scripts/fetchNCCIH.js
```

Optional enrichment scripts:

```bash
npm run seed:usda
npm run seed:openfda
node scripts/fetchPubMed.js
```

Run all ingestion pipelines together with:

```bash
npm run seed:all
```

To create the local administrator seed account, run `npm run seed:admin` and review the credentials defined by `server/scripts/seedAdmin.js` before using it.

## Run Locally

Start the API in one terminal:

```bash
cd server
npm start
```

Verify the API:

```bash
curl http://localhost:8080/health
```

Start the Vite client in a second terminal:

```bash
cd client
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The deployed Vercel client uses an SPA rewrite so direct visits and browser refreshes continue to work on application routes.

## API Overview

Health:

- `GET /health` returns `{ "status": "ok" }`.

Public discovery:

- `GET /api/search?q=<query>` returns the top ranked compounds.
- `GET /api/search/ailments` returns ailment categories.
- `GET /api/compounds/:id` returns a compound and its linked ailments.
- `GET /api/medications` returns the medication catalog.

Authentication:

- `POST /api/auth/register` creates an account and returns access and refresh tokens.
- `POST /api/auth/login` authenticates an account.
- `POST /api/auth/refresh` rotates a valid refresh token.
- `POST /api/auth/logout` revokes the submitted refresh token.

Authenticated features:

- `GET /api/bookmarks` lists saved remedies.
- `POST /api/bookmarks` saves `{ "compoundId": number }`.
- `DELETE /api/bookmarks/:compoundId` removes a saved remedy.
- `GET /api/medications/mine` lists the current user's medications.
- `POST /api/medications/mine` replaces the list with `{ "medication_ids": number[] }`.
- `GET /api/interactions?compound=<id>&medications=<id1>,<id2>` returns matching conflicts.
- `POST /api/chatbot/recommend` returns three profile-aware recommendations.
- `GET /api/users/me` returns the current profile and disclaimer status.
- `PATCH /api/users/disclaimer` records disclaimer acknowledgement.
- `PATCH /api/users/password` changes the password after validating the current password.

## Testing And Verification

Frontend lint and production build:

```bash
cd client
npm run lint
npm run build
```

Backend unit and integration tests:

```bash
cd server
npm test
```

Focused test examples:

```bash
npm test -- --runTestsByPath tests/unit/search.test.js
npm test -- --runTestsByPath tests/unit/tokens.test.js tests/integration/auth.refresh.test.js
```

Database-backed integration tests require a migrated and seeded PostgreSQL database. The chatbot integration tests mock Gemini and verify application behavior without making external API requests.

## Project Structure

```text
holistic-health/
  client/
    public/
    src/
      components/       Shared navigation and assistant UI
      pages/            Landing, search, remedy, auth, dashboard, and settings views
      App.jsx           Client route table
      index.css         Global styles
    vercel.json         SPA fallback configuration
  server/
    db/                 PostgreSQL connection, schema, and migration
    middleware/         Authentication and rate limiting
    routes/             Auth, search, compounds, bookmarks, medications, interactions, users, and chatbot APIs
    scripts/            Seed and external data ingestion pipelines
    tests/               Unit and integration coverage
    utils/              Search scoring, graph, and token helpers
    index.js             Express application and server bootstrap
  FIXES.md              Historical development notes
  README.md             Product and setup documentation
```

## Safety And Data Notes

- Remedy information is educational and evidence-aware, not medical advice.
- Interaction records are curated direct compound-medication edges and may not cover every possible risk.
- Evidence tiers provide context for the available source material; they do not guarantee effectiveness or safety.
- External ingestion depends on third-party API availability, quotas, and configured keys.
- Refresh tokens are opaque, single-use, rotated, and stored as HMAC-SHA-256 hashes in PostgreSQL. Reuse detection revokes the token family.

## Known Limitations

- Frontend automated tests are not currently included.
- Interaction data is curated and direct-edge based; it is not a substitute for medical advice.
- External data scripts depend on third-party API availability and configured keys.
