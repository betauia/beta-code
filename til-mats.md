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
| `POST` | `/api/problems/submit` | `{ code, problemId }` | `{ jobId }` | Adds job to Redis queue |
| `GET` | `/api/problems/status` | `?jobId=<id>` | `{ state, result?, error? }` | Poll this until `state` is `"completed"` or `"failed"` |
| `GET` | `/api/problems/data` | `?problemId=<id>` | Binary file download | Returns the problem's data file |
| `POST` | `/api/problems/complete-task` | `{ problemId }` | `{ success, newTask }` | Requires session; marks problem done for user |
 
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
- The cookie is `HttpOnly` and `SameSite=Lax`
 
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
 
- Passwords are hashed with SHA-256 using a random salt
- `completed_tasks` is a PostgreSQL text array of problem IDs (e.g. `{"problem1","problem3"}`)
- Default admin account (`admin` / `admin123`) is created on first startup
 
---
 
## Redis / Job Queue Details
 
**Library:** BullMQ (built on top of Redis)
 
**Queue name:** `"submissions"`
 
**Job payload:**
```json
{
  "code": "// user's C++ code as a string",
  "problemId": "problem1"
}
```
 
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
4. **No authentication on the worker** - The worker trusts whatever is in the Redis queue. The API is responsible for validating input before queuing.
5. **The sandbox has no network** - By design. Don't change this unless you have a very good reason.
6. **Password hashing uses SHA-256** - Not bcrypt/argon2. This is a known weakness if you're hardening security.
7. **Problem test cases are on disk** - Not in the database. They live in `runner/problems/<id>/tests.json`.