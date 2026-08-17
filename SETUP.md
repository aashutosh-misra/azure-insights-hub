# QA Delivery Intelligence — Setup & User Guide

This app tracks projects, modules, test cases, execution, defects, risks and
release readiness, with an optional live Azure DevOps project-health dashboard.

Everything can be stored in a **PostgreSQL database** so a whole team shares the
same data.

---

## 1. Fastest way to run it (Docker)

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/). Nothing else.

```sh
cp .env.example .env      # 1. create your settings file
docker compose up -d      # 2. start the app + database
```

Open **http://localhost:3000**

That's it. The database is created automatically, tables are created on first
launch, and the data is kept in a Docker volume (`db-data`) so it survives restarts.

To stop: `docker compose down` · To stop and erase all data: `docker compose down -v`

---

## 2. Running locally without Docker

Requirements: Node.js 20+ and a PostgreSQL server (local or hosted).

```sh
npm install
cp .env.example .env
# edit .env → set DATABASE_URL to your database
npm run dev            # development, http://localhost:8080
# or
npm run build && node .output/server/index.mjs   # production, http://localhost:3000
```

---

## 3. Managing the database connection (no coding needed)

There is exactly **one** setting:

```
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE
```

| Part       | Meaning                          | Example         |
| ---------- | -------------------------------- | --------------- |
| `USER`     | database username                | `qa`            |
| `PASSWORD` | database password                | `qa_password`   |
| `HOST`     | machine running Postgres         | `localhost`, `db` (inside Docker) |
| `PORT`     | database port                    | `5432`          |
| `DATABASE` | database name                    | `qa`            |

Examples:

```sh
# Local Postgres on your laptop
DATABASE_URL=postgres://qa:qa_password@localhost:5432/qa

# Managed/cloud Postgres that requires SSL
DATABASE_URL=postgres://user:pass@my-host.cloud:5432/qa?sslmode=require
```

Change it in `.env`, then restart (`docker compose up -d --build` or restart `npm run dev`).

**Checking it works:** open **Admin Backend** in the app. The *Database* card
shows `Connected — PostgreSQL …` in green, or the exact error in red if
something is wrong.

**If `DATABASE_URL` is empty or unreachable**, the app still works: it falls back
to storing data in your browser (demo mode). The Admin Backend card tells you
which mode you are in.

### Backups

```sh
# Backup
docker compose exec db pg_dump -U qa qa > backup.sql
# Restore
cat backup.sql | docker compose exec -T db psql -U qa qa
```

You can also use **Admin Backend → Export JSON** for a file you can keep offline.

---

## 4. Optional integrations

Add these to `.env` and restart:

| Setting | What it enables |
| ------- | --------------- |
| `AZURE_DEVOPS_ORG_URL` + `AZURE_DEVOPS_PAT` | Live Project Health dashboard, work-item drill-downs |
| `LOVABLE_API_KEY` | "Generate with AI" test-case creation |

The Azure token needs read access to Work Items and Projects.

---

## 5. Navigating the app

| Page | What you do there |
| ---- | ----------------- |
| **Dashboard** | KPIs, execution trend, status mix; filter by project and module, click any KPI to drill into the underlying items |
| **Project Health** | Live Azure DevOps RAG status, stale/overdue tasks, bugs, risks — click a chip to see the work items |
| **Portfolio** | Cross-project RAG roll-up |
| **Projects** | Create projects and set the Core type (Symitar, DNA, Keystone, Portico, Other) |
| **Modules** | Scope of a project — every module belongs to one project |
| **Test Cases** | Author cases inside a module; import Excel/CSV (headers are mapped automatically), generate with AI and pick which suggestions to keep, full version history with restore |
| **Repository (COE)** | Central core-wise master library — copy master cases into a project module, or publish project cases back to the library |
| **Test Plans** | Group cases into plans, approvals |
| **Execution** | Run cases and record Pass/Fail/Hold; progress shown project-wise and module-wise |
| **Defects** | Log and track defects linked to modules and test cases |
| **Tasks** | Assign work to team members with due dates |
| **RTM** | Requirement-to-test coverage matrix |
| **Risks** | Risk register and SLA breaches |
| **Go / No-Go** | Release readiness verdict per project |
| **Recommendations** | Automatic QA insights and next actions |
| **Users** | People, roles and project assignments |
| **Admin Backend** | Database status, platform settings, SSO fields, JSON export / reset, audit log |

### Typical first run

1. **Projects** → add your project and pick its Core.
2. **Modules** → add the modules in scope for that project.
3. **Test Cases** → import an Excel/CSV, copy from the **Repository**, or generate with AI.
4. **Test Plans** → build a plan, then run it in **Execution**.
5. Track outcomes in **Defects**, **Dashboard** and **Go / No-Go**.

---

## 6. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Admin Backend shows "DATABASE_URL not set" | Add it to `.env` and restart the app |
| `ECONNREFUSED` | Postgres isn't running, or the host/port is wrong |
| `password authentication failed` | Wrong user/password in `DATABASE_URL` |
| `self signed certificate` | Append `?sslmode=require` to the URL |
| Port 3000 already in use | Set `APP_PORT=3001` in `.env`, then `docker compose up -d` |
| Data looks empty after switching to Postgres | Browser demo data isn't copied automatically — use Admin Backend → Export JSON first |
