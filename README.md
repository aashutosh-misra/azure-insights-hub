# QA Delivery Intelligence Hub

Project, module, test-case, execution, defect and release-readiness tracking, with a
live Azure DevOps project-health dashboard and an AI-assisted test-case authoring flow.

Data is stored in **PostgreSQL** (shared across the team). Without a database the app
still runs in demo mode using browser storage.

## Quick start (Docker)

```sh
cp .env.example .env
docker compose up -d
```

Open http://localhost:3000

## Quick start (local)

```sh
npm install
cp .env.example .env      # set DATABASE_URL
npm run dev               # http://localhost:8080
```

## Configuration

One setting controls the database:

```
DATABASE_URL=postgres://user:password@host:5432/dbname
```

Check the connection any time in the app under **Admin Backend → Database**.

**Full setup, configuration, backup and page-by-page navigation guide: [SETUP.md](./SETUP.md)**

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ff773b7-ff18-4ab9-9b92-bd807aaa8b7e).
