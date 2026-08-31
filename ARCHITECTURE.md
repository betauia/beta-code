# Server Communication Guide
 
How every piece of Beta-Code talks to every other piece.
 
---
 
## Architecture Overview
 
```
Browser
  │
  │  HTTP (port 4321)
  ▼
Astro Frontend ──────────► PostgreSQL (port 5432)
  │                            ▲
  │  Redis (port 6379)         │
  │  BullMQ job queue          │
  ▼                            │
Runner Worker ─────────────────┘
  │
  │  docker run (no network)
  ▼
Docker Sandbox (cpp-sandbox:latest)
```
 
There are **5 components**: the browser, the Astro frontend (which serves both the UI and the API), PostgreSQL, Redis, and the Runner Worker. The Docker sandbox is spawned on-demand by the worker and has no network access.
 
---
 
## Communication Channels
 
| From | To | Protocol | Purpose |
|------|----|----------|---------|
| Browser | Astro Frontend | HTTP REST | Page loads, API calls |
| Astro Frontend | PostgreSQL | TCP (pg driver) | User data, auth |
| Astro Frontend | Redis | TCP (ioredis) | Submit jobs to queue |
| Runner Worker | Redis | TCP (BullMQ) | Pick up jobs from queue |
| Runner Worker | PostgreSQL | *(none currently)* | Worker doesn't write to DB |
| Runner Worker | Docker | Child process (`docker run`) | Execute sandboxed code |
| Runner Worker | File System | Node.js fs | Read tests, write temp files, read results |
 
---
 
## How a Code Submission Flows
 
This is the most important flow in the system. Follow the numbers:
 
```
 ┌──────────┐   1. POST /api/problems/submit   ┌──────────────┐
 │  Browser  │ ──────────────────────────────► │  Astro API   │
 │           │ ◄────────────────────────────── │              │
 └──────────┘   2. { jobId: "abc123" }         └──────┬───────┘
      │                                                │
      │  5. Poll GET /api/problems/status?jobId=abc123 │ 3. Queue.add("submissions", { code, problemId })
      │     until state != "active"                    │
      │                                                ▼
      │                                         ┌────────────┐
      │                                         │   Redis     │
      │                                         │  (BullMQ)   │
      │                                         └──────┬─────┘
      │                                                │
      │                                                │ 4. Worker picks up job
      │                                                ▼
      │                                         ┌────────────────┐
      │                                         │  Runner Worker  │
      │                                         │                 │
      │                                         │  a. mkdtemp()   │
      │                                         │  b. Write main.cpp + test inputs
      │                                         │  c. docker run cpp-sandbox
      │                                         │  d. Read results.json
      │                                         │  e. Return { verdict, tests }
      │                                         └────────────────┘
      │
      │  6. { state: "completed", result: { verdict, tests } }
      ▼
 User sees pass/fail
```
 
### Step-by-step
 
1. **Browser sends code** - `POST /api/problems/submit` with `{ code, problemId }`
2. **API queues the job** - Uses BullMQ to add a job to the `"submissions"` Redis queue. Returns the `jobId` immediately.
3. **Job sits in Redis** - Waiting for a worker to pick it up.
4. **Worker processes the job**:
   - Creates a temp directory
   - Writes `main.cpp` (the user's code) and test input files
   - Runs `docker run --rm --network=none cpp-sandbox:latest` with the temp dir mounted
   - The sandbox compiles with `g++ -std=c++20`, runs each test with a 2-second timeout
   - Sandbox writes `results.json` to the mounted volume
   - Worker reads `results.json` and returns it as the job result
5. **Browser polls for status** - `GET /api/problems/status?jobId=abc123` in a loop
6. **Result delivered** - Once the job completes, the status endpoint returns the result
 
---
 
## API Endpoints Reference
 
### Authentication
 
| Method | Path | Body | Response | Side Effects |
|--------|------|------|----------|-------------|
| `POST` | `/api/user/signup` | `{ username, password }` | `{ success, user }` | Creates user in PostgreSQL, sets `session_id` cookie |
| `POST` | `/api/user/login` | `{ username, password }` | `{ success, user }` | Validates credentials, sets `session_id` cookie |
| `POST` | `/api/user/logout` | *(none)* | `{ success }` | Destroys session, clears cookie |
| `GET` | `/api/user/me` | *(none)* | `{ user }` or 401 | Reads session cookie |
 
### Problems / Submissions
 
| Method | Path | Body / Query | Response | Notes |
|--------|------|-------------|----------|-------|
| `POST` | `/api/problems/submit` | `{ code, problemId }` | `{ jobId }` | Requires session; adds job to Redis queue (stamped with the submitter's `userId`) |
| `GET` | `/api/problems/status` | `?jobId=<id>` | `{ state, result?, error? }` | Requires session; only the submitting user (or an admin) can read a given job. Poll until `state` is `"completed"` or `"failed"` |
| `GET` | `/api/problems/data` | `?problemId=<id>` | Binary file download | Returns the problem's data file |
| `POST` | `/api/problems/complete-task` | `{ problemId }` | `{ success, newTask }` | Requires session; marks problem done for user |
| `GET` | `/api/completions` | *(none)* | `{ completions, pointsById, playerUsernames, competitionStart, competitionEnd }` | Requires session; feeds the leaderboard's score graph |
 
### Admin (requires `is_admin = true`)
 
| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/admin/user` | *(none)* | `{ users: [...] }` |
| `POST` | `/api/admin/update-tasks` | `{ userId, problemId, action }` | `{ success }` |
| `POST` | `/api/admin/delete-user` | `{ userId }` | `{ success }` |
 
`action` is either `"add"` or `"remove"`.
 
---
 
## Session / Auth Model
 
Sessions are stored **in memory** on the Astro server process (not in Redis or the database).
 
```
Browser                          Astro Server (in-memory store)
   │                                    │
   │  POST /api/user/login              │
   │  { username, password }            │
   │ ──────────────────────────────►    │
   │                                    │  1. Verify password against DB
   │                                    │  2. Generate session ID (crypto.randomUUID)
   │                                    │  3. Store { sessionId → userId } in memory
   │  Set-Cookie: session_id=<id>       │
   │ ◄────────────────────────────────  │
   │                                    │
   │  GET /api/user/me                  │
   │  Cookie: session_id=<id>           │
   │ ──────────────────────────────►    │
   │                                    │  4. Look up userId from sessionId
   │                                    │  5. Query PostgreSQL for user data
   │  { user: { id, username, ... } }   │
   │ ◄────────────────────────────────  │
```
 
**Important for server work:**
- Sessions expire after **24 hours**
- If the Astro process restarts, **all sessions are lost** (users must log in again)
- The cookie is `HttpOnly`, `SameSite=Lax`, and additionally `Secure` when running a production build (`import.meta.env.PROD`)
- `POST /api/user/login` is rate-limited in memory: 8 failed attempts per `IP + username` pair within a 10-minute window return `429` until it resets (`frontend/src/lib/rateLimit.ts`)
 
---
 
## Database Schema
 
Single table in PostgreSQL (`beta_code` database):
 
```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt          VARCHAR(255) NOT NULL,
  completed_tasks TEXT[] DEFAULT '{}',
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);
```
 
- Passwords are hashed with `scrypt` (Node's built-in, memory-hard) using a random salt. Accounts created before this change still have a legacy SHA-256 hash on disk; `verifyUser()` detects that by hash length (64 hex chars = legacy, 128 = scrypt), verifies against it once, and transparently re-hashes to scrypt on that successful login.
- `completed_tasks` is a PostgreSQL text array of problem IDs (e.g. `{"problem1","problem3"}`)
- Default admin account (`admin` / `admin123`) is created on first startup

There's also a `task_completions` table (`user_id`, `task_id`, `completed_at`) recording *when* each task was finished — used by the leaderboard's score graph and by `getUserCompletions()` to tie-break equal leaderboard scores (whoever reached that score first ranks higher). `completed_tasks` on `users` itself carries no timestamp.

**Timezone handling:** `TIMESTAMP` columns (no time zone) store naive digits. Postgres's session `timezone` is forced to `UTC` on every connection (`db.ts`, `options: "-c timezone=UTC"`), and the `pg` driver's default type parser for that column type would otherwise read those naive digits back using the *Node process's* local OS timezone instead of UTC — silently shifting every stored time by that offset. `db.ts` overrides the OID 1114 type parser to append `Z` before parsing, forcing UTC interpretation regardless of what timezone the server process itself runs in.
 
---
 
## Redis / Job Queue Details
 
**Library:** BullMQ (built on top of Redis)
 
**Queue name:** `"submissions"`
 
**Job payload:**
```json
{
  "code": "// user's C++ code as a string",
  "problemId": "problem1",
  "userId": 42
}
```

`userId` is stamped on the job by `/api/problems/submit` and checked by `/api/problems/status` — a player can only poll the status of their own submissions (admins can view any).
 
**Job result (on success):**
```json
{
  "verdict": "pass",
  "tests": [
    { "input": "5\n3 1 4 1 5", "expected": "1 1 3 4 5", "actual": "1 1 3 4 5", "passed": true },
    { "input": "3\n9 2 7", "expected": "2 7 9", "actual": "2 7 9", "passed": true }
  ]
}
```
 
**Job result (on failure - e.g. compilation error):**
```json
{
  "verdict": "fail",
  "error": "main.cpp:5:1: error: expected ';' after expression"
}
```
 
**Worker concurrency:** Configurable via `CONCURRENCY` env var (default: 5).
 
---
 
## Docker Sandbox
 
The sandbox runs user-submitted C++ code in a locked-down Docker container.
 
**Security constraints:**
| Constraint | Value |
|-----------|-------|
| Network | `--network=none` (no internet) |
| CPU | 1.0 core max |
| Memory | 256 MB max |
| PIDs | 64 max |
| Capabilities | All dropped |
| Privileges | `--security-opt=no-new-privileges` |
 
**How the worker calls it:**
```
docker run --rm \
  --network=none \
  --cpus=1.0 \
  --memory=256m \
  --pids-limit=64 \
  --security-opt=no-new-privileges \
  --cap-drop=ALL \
  -v /tmp/job-xyz:/workspace \
  cpp-sandbox:latest
```
 
**Inside the sandbox (`run.sh`):**
1. Compile: `g++ -std=c++20 -o solution main.cpp`
2. For each test: run `./solution < input.txt` with a 2-second timeout
3. Write `results.json` to `/workspace`
 
---
 
## Environment Variables
 
| Variable | Default | Used By | Purpose |
|----------|---------|---------|---------|
| `DATABASE_URL` | `postgres://postgres:postgres@127.0.0.1:5432/beta_code` | Frontend | PostgreSQL connection |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Frontend + Worker | Redis/BullMQ connection |
| `PROBLEMS_DIR` | `./runner/problems` | Worker | Where problem test cases live |
| `JOBS_BASE` | `./runner/jobs` | Worker | Temp directory for job files |
| `CONCURRENCY` | `5` | Worker | How many jobs to process in parallel |
| `RUNNER_SECRET` | *(none — required)* | Frontend + Worker | Shared bearer token gating `GET /api/tasks/tests`, the internal endpoint that returns hidden tests' expected output. If unset or mismatched, the frontend returns `403` — it fails **closed**, not open. |

`frontend/.env` is gitignored (see `frontend/.env.example` for the template); it holds `DATABASE_URL`, `REDIS_URL`, and the local dev `RUNNER_SECRET`. It used to be committed to the repo — if you're on an older checkout, regenerate your local secrets rather than trusting whatever was in git history.
 
---
 
## File Layout (What's Where)
 
```
frontend/
  src/
    pages/api/         ← All REST endpoints live here
      user/            ← login, signup, logout, me
      problems/        ← submit, status, data, complete-task
      admin/           ← user management
    lib/
      db.ts            ← PostgreSQL connection pool (singleton)
      session.ts       ← In-memory session store
      users.ts         ← User CRUD operations
 
runner/
  worker.js            ← BullMQ worker process
  problems/            ← Problem definitions + test cases
    <problemId>/
      tests.json       ← Test inputs and expected outputs
      data.*           ← Optional data file for the problem
 
sandbox/
  Dockerfile           ← Builds the cpp-sandbox image
  run.sh               ← Compile + run script inside container
```
 
---
 
## Things to Know Before Touching the Server
 
1. **No WebSockets** - The frontend polls for submission status. If you want real-time updates, you'd need to add WebSocket support.
2. **Sessions are in-memory** - A server restart loses all sessions. If you need persistence, move sessions to Redis.
3. **Worker is a separate process** - It runs independently from the Astro frontend. They only communicate through Redis.
4. **No authentication on the worker** - The worker trusts whatever is in the Redis queue. The API is responsible for validating input before queuing. The worker does authenticate itself to the frontend, though: it fetches test cases (including hidden ones) via `GET /api/tasks/tests`, which requires a `RUNNER_SECRET` bearer token — this must be set identically for both processes or that endpoint refuses all requests.
5. **The sandbox has no network** - By design. Don't change this unless you have a very good reason.
6. **Password hashing uses scrypt** - Node's built-in memory-hard KDF. Legacy accounts (pre-scrypt) still verify against their old SHA-256 hash and get transparently migrated on next successful login.
7. **Problem test cases are on disk** - Not in the database. They live in `runner/problems/<id>/tests.json`.
8. **Submission status is scoped per-user** - `GET /api/problems/status` checks the requesting user owns the job (or is an admin) before returning results; it used to be unauthenticated and readable by anyone who guessed a job ID.
9. **No CSP** - A middleware (`frontend/src/middleware.ts`) sets baseline headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.) on every response, but there's no script-src Content-Security-Policy, since the app relies on inline `<script>` tags across `.astro` pages. Adding a strict CSP would need a nonce-based rework first.