# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route-specific labels and item formatting in the capability components; use the shared capability view and API client for loading, error, empty, and success states.
- Logic tier decision: Keep HTTP routing in Express routes and validation/calculation/query behavior in explicit service functions. Return deliberate 4xx responses for invalid or missing references.
- Data tier decision: Use Mongoose schemas for required fields, trimming, defaults, and references; keep demo data creation idempotent in the seed script.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; validate ID shape and referenced records, compute points from minutes, and default `occurredAt` to the current time.
- Team management approach: Require a name and mascot, default members to an empty array, and validate submitted member IDs before storing them.
- Leaderboard approach: Sum activity points by team, include teams with no activity at zero points, sort by total points descending, and assign 1-based ranks.
- Workout suggestions approach: Find the user by email, rank workouts by fitness-goal and recent-activity focus matches, include a reason, and return 404 when the user does not exist.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` (not run separately; its 5 tests passed in the full backend run). Failures indicate schema validation/default or seed idempotency problems.
- API command: `npm run test:api --prefix octofit-tracker/backend` (not run separately; its 4 tests passed in the full backend run). Failures indicate request validation/status-code, persistence, leaderboard, or recommendation behavior problems.
- Frontend command: `npm test --prefix octofit-tracker/frontend` (ran; 15 tests passed). Failures indicate regressions in API requests or loading, empty, error, or populated UI states.
- Backend build command: `npm run build --prefix octofit-tracker/backend` (ran; passed). Failures indicate backend TypeScript errors.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` (ran; passed). Failures indicate frontend type-checking or production-bundling errors.
- Full backend verification: `npm test --prefix octofit-tracker/backend` (ran; 9 tests passed).
