# Student Support & Ticket Management API

NestJS + PostgreSQL + TypeORM backend for the college support assignment. Includes 24 documented API operations, JWT authentication, role/ownership checks, a ticket state machine, paused SLAs, automatic escalation, immutable audit history and reporting.

## Setup

Requires Node.js 22+ and PostgreSQL 14+ (tested with Node 26 and PostgreSQL 18).

1. Run `npm install`.
2. Copy `.env.example` to `.env` if you do not already have one. Set valid database credentials and create the database named by `DB_NAME`.
3. Set `JWT_SECRET` to a random value of at least 32 characters. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10–128 characters) for the initial administrator.
4. Run `npm run migration:run` to create the schema and default SLA policies. Schema synchronization is deliberately disabled.
5. Run `npm run seed` to create the administrator. Re-running does not change an existing administrator's password or promote an existing student.
6. Run `npm run start:dev`.

Default API: http://localhost:8500/api

Swagger UI: http://localhost:8500/api-docs

OpenAPI JSON: http://localhost:8500/api-docs-json

`npm run docs:export` regenerates `docs/openapi.json` without a running database. Import this file into Postman or any OpenAPI client. The request and response documentation uses NestJS Swagger decorators: https://docs.nestjs.com/openapi/operations.

For production, run `npm run build` then `npm run start:prod`. Configure `HOST` when external access is needed. CORS allows the local frontend origins by default; set `CORS_ORIGINS` to a comma-separated allowlist for other environments. No credentials are embedded in source or seed data. Existing `.env` files are not overwritten.

## Try the workflow in Swagger

1. Log in with the seeded admin using `POST /api/auth/login`. Copy `accessToken` into **Authorize** (enter the token itself).
2. Create a STAFF account using public `POST /api/auth/users` as `multipart/form-data`, including the selected department label.
3. Register a student with `POST /api/auth/register`, authorize as that student, and create a ticket.
4. Authorize as admin and assign the ticket to the staff user and a team.
5. Authorize as the assigned staff user. Change the ticket to `IN_PROGRESS`, then `PENDING_STUDENT` with a reason.
6. Authorize as the student and add a comment. The ticket automatically resumes and its resolution deadline extends by the actual paused duration.
7. Staff resolves the ticket with a resolution note/category. The student can close it or reopen it with a reason.
8. View the activity history, dashboard, and SLA policy endpoints.

## Permissions

| Role | Access |
| --- | --- |
| STUDENT | Register, log in, create/read own tickets, reply, close resolved tickets, reopen, cancel eligible tickets, read public history and SLA policies |
| STAFF | Read support tickets/users, create tickets for students, claim unassigned tickets for self, work/transfer owned tickets, view internal notes and dashboard |
| ADMIN | Manage accounts and SLA policies, assign/work any ticket, run escalation sweep, view reporting |

Manager responsibilities are represented by ADMIN. Public registration always creates STUDENT accounts and rejects a supplied role. Every authenticated request reloads the active user; a deactivated user's existing token stops working. Passwords are salted and hashed using Node's scrypt and never appear in responses or Swagger schemas.

Students receive 404 for other students' ticket IDs. Staff can read the shared support queue, but only the assigned owner or admin can modify work or add staff comments. Users cannot deactivate themselves. Active tickets must be transferred before staff deactivation. Assignment, reopening and deactivation coordinate row locks to prevent assigning active work to an inactive user. Reopening a resolved ticket whose owner has left clears its assignment; it must be assigned before work resumes.

## Ticket lifecycle

```text
NEW -> ASSIGNED -> IN_PROGRESS
                       |   ^
                       v   |
             PENDING_STUDENT / PENDING_INTERNAL
                       |
              resume IN_PROGRESS -> RESOLVED -> CLOSED
                                      |           |
                                      +-> REOPENED <-+
                                             |
                                        IN_PROGRESS

NEW / ASSIGNED / IN_PROGRESS -> CANCELLED
```

- Starting work requires an assignee. Both pending states require a reason visible to the student.
- A student reply in PENDING_STUDENT resumes work automatically. Staff replies and internal notes do not resume it.
- Only IN_PROGRESS tickets can be resolved. Resolution note and category are mandatory.
- Only RESOLVED tickets can be closed. RESOLVED and CLOSED tickets can be reopened with a reason.
- Reopening begins a fresh SLA cycle; the previous resolution is preserved in the immutable activity history.
- CANCELLED is terminal. Cancellation requires a reason. Resolved/closed/cancelled tickets cannot receive comments or assignment/priority changes.
- There are no destructive ticket/user/comment/history deletion endpoints.

## SLA decisions

SLAs use 24/7 calendar minutes in UTC, not college working hours or holiday calendars.

| Priority | First response | Resolution |
| --- | --- | --- |
| LOW | 8 hours | 48 hours |
| MEDIUM | 4 hours | 24 hours |
| HIGH | 2 hours | 8 hours |
| URGENT | 30 minutes | 4 hours |

- First response is the first public staff reply, a request for student information, or the resolution itself. Claiming a ticket, starting work, and internal notes do not count.
- At 80% consumed, the applicable SLA is AT_RISK; at the deadline it is BREACHED. Completion exactly at the deadline meets SLA. Completed response/resolution outcomes remain frozen.
- PENDING_STUDENT pauses resolution only. PENDING_INTERNAL does not pause either clock. Pausing cannot erase an existing breach.
- `resolutionDueAt` includes completed pauses; `sla.effectiveResolutionDueAt` also includes the current unfinished pause. `sla.resolution` reports PAUSED while waiting unless it was already breached.
- Each ticket stores a policy snapshot. Policy edits affect future tickets/reopenings and explicit priority changes. Reprioritization preserves elapsed time and accumulated pauses. A higher priority can cause an immediate breach.
- A scheduler checks active tickets every 60 seconds. Escalation level 1 means at risk, 2 means breached. The highest level reached is retained until reopening. A single event per increasing level per cycle is stored transactionally; multiple server instances cannot duplicate an event. Both response and resolution can trigger escalation.
- The scheduler records indicators and history; it does not send email/SMS. ADMIN can run it immediately through the API. Set `SLA_SCHEDULER_ENABLED=false` to disable periodic runs.

## API inventory

All protected endpoints use `Authorization: Bearer <token>`. Swagger documents request fields, enums, examples, query parameters, successful response schemas and common 400/401/403/404/409 errors. Unexpected failures return Nest's generic 500 response.

| Method | Path (under /api) | Purpose |
| --- | --- | --- |
| GET | /health | Public process health |
| POST | /auth/register | Student registration |
| POST | /auth/login | Login; 24-hour token |
| GET | /auth/me | Current active user |
| GET | /users | Paginated user directory (staff/admin) |
| POST | /auth/users | Create accounts (public, multipart/form-data) |
| PATCH | /users/:id/active | Activate/deactivate account (admin) |
| POST | /tickets | Create ticket |
| GET | /tickets | Paginated search and filters |
| GET | /tickets/:id | Details and live SLA |
| PATCH | /tickets/:id/assignment | Assign, claim or transfer |
| PATCH | /tickets/:id/priority | Reprioritize |
| PATCH | /tickets/:id/status | Start or change pending state |
| PATCH | /tickets/:id/resolve | Record resolution |
| PATCH | /tickets/:id/close | Confirm closure |
| PATCH | /tickets/:id/reopen | Reopen with reason |
| PATCH | /tickets/:id/cancel | Cancel with reason |
| POST | /tickets/:id/comments | Reply/internal note |
| GET | /tickets/:id/comments | Paginated visible comments |
| GET | /tickets/:id/activities | Paginated visible audit history |
| GET | /sla/policies | SLA policy directory |
| PATCH | /sla/policies/:priority | Edit policy (admin) |
| POST | /sla/escalations/run | Immediate sweep (admin) |
| GET | /dashboard | Counts, SLA health, resolution average, workload |

Pagination defaults to page 1 and limit 20, maximum 100. Ticket filters: status, priority, category, assignedTo, search. Search is case-insensitive and treats SQL wildcard characters literally. Results have deterministic ordering. Unknown body/query fields, invalid UUIDs/enums, explicit null values, blank text, and out-of-range pagination are rejected.

Dashboard resolution averages cover currently resolved/closed tickets' latest cycles, excluding student pauses. Active workload includes pending and reopened tickets. Internal comment content and associated internal audit events never appear in student responses. Departments/teams are validated text labels rather than separate managed records.

## Data integrity and testing

Ticket changes and their audit entries share transactions. Pessimistic row locks serialize competing state changes. Database constraints enforce foreign keys, unique ticket numbers/emails, SLA duration rules and key workflow invariants. A PostgreSQL trigger rejects UPDATE/DELETE on audit entries. The system generates UUID-based ticket numbers, avoiding races from count-based numbering. Requests are not automatically deduplicated: repeated create requests create separate tickets.

```sh
npm run build
npm run lint
npm test
npm run test:e2e
npm run docs:export
```

Unit tests run without PostgreSQL. Integration tests use the configured database, create a random `test_support_<uuid>` schema, run real migrations and HTTP requests, and remove only that test schema afterward. The database user needs CREATE SCHEMA permission. Use a development/test database; the suite never truncates existing application tables. The suite supplies its own JWT secret and disables the periodic scheduler.

Integration coverage includes authorization, validation, secret exclusion, ticket lifecycle, SLA pauses, policy snapshots, concurrent resolution and assignment/deactivation, escalation deduplication, transaction rollback on audit failure, immutable history, inactive assignee reopening, and a Swagger check covering all 24 operations.

## Deliberate scope

Attachments, external notifications, business-hour calendars, refresh tokens/password recovery, automatic closure, and managed department records are outside this assignment implementation. A deployment should provide HTTPS and request-rate limits at its gateway. No claim is made that tests exhaust every possible deployment or concurrency condition.
