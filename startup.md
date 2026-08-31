# Webserver Launch Instructions

This guide provides step-by-step instructions to launch the webserver and its required services.

## Prerequisites

- Docker installed and running
- Node.js and npm installed
- Redis (via Docker)

Run this in root to get all the packages:

```bash
npm run install:all
```

## Configure Environment Variables

`.env` files hold local secrets and aren't committed to git. Copy the template and fill it in (a `RUNNER_SECRET` is required — the frontend refuses to serve test data without one):

```bash
cp frontend/.env.example frontend/.env
```

Generate a `RUNNER_SECRET` value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste it into `frontend/.env`, and use the same value for `RUNNER_SECRET=` in the root `package.json` `start`/`build` scripts (the runner process reads it from there, not from a `.env` file).

## Launch the Services

Run this in root:

```bash
npm start
```

## Stopping the Services

To stop the services, press `Ctrl+C` in terminal window.
And then type 

```bash
npm run stop
```

## Admin panel

Username: `admin`

Password: `admin123`
