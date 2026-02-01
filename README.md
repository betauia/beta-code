# Project Setup & Web Server Launch Guide

This document explains how to start all required services for the project: **Redis**, the **frontend**, and the **runner worker**.

---

## Prerequisites

Make sure you have the following installed:

- Docker
- Node.js (with npm)
- A terminal (PowerShell, Command Prompt, or Bash)

---

## 1. Start Redis

From the **project root folder**, run:

```bash
docker run --rm -p 6379:6379 redis:7
