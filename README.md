# Webserver Launch Instructions

This guide provides step-by-step instructions to launch the webserver and its required services.

## Prerequisites

- Docker installed and running
- Node.js and npm installed
- Redis (via Docker)

## Launch Steps

Follow these steps in order to start all required services:

### 1. Start Redis (Docker)

Run this command from anywhere:

```bash
docker run --rm -p 6379:6379 redis:7
```

This starts a Redis server on port 6379. Keep this terminal window open.

### 2. Start the Frontend Development Server

Open a new terminal, navigate to the `frontend` folder, and run:

```bash
cd frontend
npm run dev
```

Keep this terminal window open.

### 3. Start the Worker/Runner

Open a third terminal, navigate to the root folder, and run:

```bash
REDIS_URL="redis://127.0.0.1:6379" PROBLEMS_DIR="$ROOT/runner_problems" JOBS_BASE="$ROOT/runner_jobs" CONCURRENCY="5" node runner/worker.js
```

You should see output similar to:
```
Runner online (concurrency=5)
Runner PROBLEMS_DIR: C:/Users/herma/Documents/UIA/BETA/beta-code\runner_problems
```

## Summary

You should now have three terminal windows running:
1. Redis server (Docker)
2. Frontend development server
3. Worker/runner process

All services must remain running for the webserver to function properly.

## Stopping the Services

To stop the services, press `Ctrl+C` in each terminal window.