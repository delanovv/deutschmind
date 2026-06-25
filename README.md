# DeutschMind

DeutschMind is a full-stack learning application that turns German vocabulary into a visual knowledge graph. It combines spaced repetition, personal learning preferences, text and image analysis, and asynchronous AI-assisted vocabulary expansion.

> Portfolio project for an Ausbildung application in software development.

## Highlights

- Interactive vocabulary graph with topic-based learning paths
- Four-dimensional knowledge model: recognition, recall, context, and production
- Spaced-repetition review queue
- Registration and JWT-based authentication
- Isolated data for each user
- Text and image analysis with background AI jobs
- Progressive Web App frontend
- PostgreSQL, Redis/BullMQ, and S3-compatible object storage
- Legacy JSON mode for a quick local demo without infrastructure

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, Vite, PWA |
| Backend | Node.js, Express, Zod |
| Database | PostgreSQL |
| Background jobs | Redis, BullMQ |
| Object storage | S3-compatible storage / MinIO |
| AI integration | OpenAI API with structured output |
| Security | JWT, bcrypt, Helmet, CORS, rate limiting |

## Architecture

```text
React PWA
    |
Express API
    |-- PostgreSQL (users, graphs, reviews, jobs)
    |-- Redis + BullMQ (background processing)
    |-- MinIO / S3 (private uploaded materials)
    `-- OpenAI API (analysis and vocabulary generation)
```

More details are available in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local setup

### Requirements

- Node.js 20 or newer
- Docker Desktop with Docker Compose
- An OpenAI API key for AI features

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port `5433`, Redis on `6379`, and MinIO on `9000`/`9001`.

### 2. Configure and start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Before starting, replace `JWT_SECRET` with a random value of at least 32 characters and add your own `OPENAI_API_KEY`. Never commit the `.env` file.

Start the worker in a second terminal:

```bash
cd backend
npm run worker
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Quick demo mode

If `DATABASE_URL` is not set, the backend uses a local JSON store. This mode is intended only for a simple single-user demonstration and does not require PostgreSQL, Redis, MinIO, or authentication.

## Available commands

### Backend

```bash
npm run dev          # development server
npm start            # production-style server
npm run worker       # background AI worker
npm run db:migrate   # apply database migrations
npm run db:seed      # import starter vocabulary for one user
npm run db:backup    # create a PostgreSQL backup
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/v2/webs`
- `GET /api/v2/webs/:id`
- `GET /api/v2/nodes/:id/neighbors`
- `POST /api/v2/nodes/:id/expand`
- `GET /api/v2/reviews/due`
- `POST /api/v2/nodes/:id/reviews`
- `POST /api/v2/materials/text`
- `POST /api/v2/materials/image`
- `GET /api/v2/jobs/:id`

## Security notes

- Secrets are read from environment variables and excluded from Git.
- Passwords are hashed with bcrypt.
- Protected routes derive the user ID from a verified JWT.
- Uploaded files are private and size/type restricted.
- Authentication, API, and AI endpoints are rate-limited.
- Production CORS requires an explicit `FRONTEND_ORIGIN`.

## Current status

The core application and production architecture are implemented. The next planned improvements are automated tests, continuous integration, deployment, and a public demo.

## License

This project is currently provided as a portfolio and demonstration project. Add a license before allowing reuse by third parties.
