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