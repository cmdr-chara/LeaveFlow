# LeaveFlow

[![CI](https://github.com/cmdr-chara/LeaveFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/cmdr-chara/LeaveFlow/actions/workflows/ci.yml)

A full-stack leave management demo built around one practical question: how can employees request time off while managers keep team availability clear at a glance?

LeaveFlow covers the complete workflow—from authentication and balance validation to manager decisions—through a responsive Vue interface and a Django REST API.

![LeaveFlow login](docs/screenshots/login.png)

## Product walkthrough

### A clear annual balance

Employees can immediately see their remaining allowance, upcoming leave and recent requests. The SVG balance gauge stays lightweight and adapts to reduced-motion preferences.

![Employee dashboard](docs/screenshots/employee-dashboard.png)

### Requests without spreadsheet archaeology

Requests are validated against dates, overlaps and the employee's available balance. Status filters keep pending and completed decisions easy to scan.

![Manager approval queue](docs/screenshots/manager-approvals.png)

### Live, role-aware notifications

Django publishes leave events only after a successful database commit. Managers receive new requests and employees receive decisions through a persisted, deduplicated notification feed that updates over authenticated Server-Sent Events.

![Live notifications](docs/screenshots/live-notifications.png)

### Team availability at a glance

Managers and administrators can compare balances and upcoming absences without opening separate calendars or employee profiles.

![Team availability](docs/screenshots/people.png)

## What is included

- token-based authentication with employee, manager and administrator roles;
- team-scoped permissions and request visibility;
- leave and permission requests with date, overlap and balance validation;
- manager approval and rejection flows;
- dashboard summaries, status filters and team availability;
- REST API, database migrations, demo seed data and automated tests;
- responsive UI with focused motion and reduced-motion support;
- persistent Italian/English localization with translated dates, plurals, roles, states and live notifications;
- Docker Compose environment and GitHub Actions CI;
- event-driven notifications delivered in real time through an authenticated Node.js service;
- Redis Streams consumer groups, deduplication, persisted notification feeds and health checks;
- structured JSON logs with request correlation, secret redaction and graceful shutdown.

## Stack

```text
Vue 3 + TypeScript  ──HTTP/Token──>  Django REST Framework  ──ORM──>  PostgreSQL
       :5173                              :8000                         :5432
          │                                  │
          │ authenticated REST + SSE         └──events──> Redis Streams
          ▼                                                  │
Node.js + TypeScript notification service <──consumer group──┘
                   :3000
```

The frontend, backend and notification worker are independent services. Django publishes domain events only after a successful database commit. The Node.js service consumes them through a Redis consumer group, deduplicates delivery, keeps a bounded notification feed per user and pushes updates to the Vue client over authenticated Server-Sent Events. It validates every client token against Django instead of maintaining a second identity system.

Docker Compose runs all services with PostgreSQL and Redis. SQLite remains available for quick backend development and tests; when `REDIS_URL` is absent, event publishing is disabled without affecting the core leave workflow.

## Run the demo

Docker Desktop is the only prerequisite.

```bash
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173).

| Role | Username | Password |
|---|---|---|
| Employee | `employee` | `demo1234` |
| Manager | `manager` | `demo1234` |
| Administrator | `admin` | `demo1234` |

Managers can review requests for their team. Administrators can also use Django Admin at [http://localhost:8000/admin/](http://localhost:8000/admin/).

## Observability

The Node.js service emits machine-readable JSON logs through Pino. HTTP entries include method, path, status, response time and an `X-Request-Id`; an existing request ID is propagated across the response when supplied by a client or reverse proxy. Authorization headers are redacted.

Worker logs deliberately contain event and request identifiers rather than employee details:

```json
{"level":30,"service":"leaveflow-notifications","environment":"development","eventId":"7cd631cb-d6aa-4142-bd3d-4acb43ef8e26","eventType":"leave.requested","requestId":51,"recipients":1,"delivered":1,"msg":"Leave event processed"}
```

Follow the service locally with:

```powershell
docker compose logs -f notifications
```

Set `LOG_LEVEL` to `debug`, `info`, `warn` or `error` as needed. The `/health` endpoint returns `503` when Redis is unavailable, allowing Docker or an orchestrator to stop routing traffic to a degraded instance.

## Run without Docker

Backend:

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python backend\manage.py migrate
.venv\Scripts\python backend\manage.py seed_demo
.venv\Scripts\python backend\manage.py runserver
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Notification service (requires Redis):

```powershell
cd notifications
npm install
$env:REDIS_URL="redis://localhost:6379"
$env:BACKEND_URL="http://localhost:8000"
npm run dev
```

## Verification

```powershell
.venv\Scripts\python backend\manage.py test leave
cd frontend
npm run build
cd ..\notifications
npm run check
npm test
npm run build
```

The automated suite covers:

- Django permissions, overlap validation, decisions and event recipient routing;
- notification schema mapping, authentication boundaries and per-user isolation;
- deduplication from domain event through storage and in-memory publication;
- authenticated SSE delivery over a real ephemeral HTTP server;
- degraded dependency health checks and request-ID propagation;
- strict TypeScript checking plus production builds for both Node.js and Vue.

## Scope and trade-offs

- Weekends are excluded from leave totals; national holidays are not modelled yet.
- User and team administration is handled through Django Admin so the product UI can focus on the leave workflow.
- The current token authentication is appropriate for a local demo. Production would require expiration and revocation policies, secure cookies or another hardened session strategy.
- Redis Streams provide durable at-least-once delivery and the notification store deduplicates each event/recipient pair. A production deployment would also add dead-letter handling and metrics for repeatedly invalid events.
- Demo data can be restored at any time with `python backend/manage.py seed_demo`.

Natural next steps include an audit log, public-holiday calendars, temporary approval delegation, calendar export and SSO.
