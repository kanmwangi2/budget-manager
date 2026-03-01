# Budget Manager Technical Blueprint

Last updated: March 1, 2026

## 1. Current Architecture

Budget Manager is a two-tier web platform:

- Frontend: React 18 + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy + Alembic
- Database: SQLite (current default)

## 2. Technology Stack

## 2.1 Frontend

- React 18
- TypeScript
- React Router v6
- TanStack Query
- Tailwind CSS
- Framer Motion
- Vitest + React Testing Library

## 2.2 Backend

- FastAPI
- SQLAlchemy 2.x ORM
- Alembic migrations
- JWT auth (`python-jose`)
- Password hashing (`bcrypt`)
- pytest + FastAPI TestClient
- local virtual environment at `backend/.venv` (preferred workflow)

## 3. Domain Model

Primary entities:

- `User`
  - role: `app_admin | org_admin | user`
  - many-to-many with organizations (`OrganizationMembership`)
  - many-to-many with departments (`DepartmentMembership`)
- `Organization`
  - has many departments
  - has many donors
- `Department`
  - belongs to one organization
- `Donor`
  - belongs to one organization

## 4. Authentication and Authorization

## 4.1 Authentication

- Email/password login
- JWT bearer access token
- `/api/auth/me` returns user + available organizations

## 4.2 Authorization Rules

- `app_admin`
  - full cross-organization access
  - can manage organizations and users globally
- `org_admin`
  - can manage only organizations where membership `is_admin = true`
- `user`
  - read-level access constrained by assigned orgs/departments
  - blocked from admin management endpoints

## 5. Organization Scoping Model

Scoping is enforced in both frontend and backend.

Frontend:

- post-login organization selection is mandatory
- selected organization is session context
- app pages query data with organization filters
- admin routes are role-guarded

Backend:

- endpoint-level checks validate org membership/management scope
- `/api/users` supports `organization_id` filter with permission checks
- `/api/donors` and `/api/departments` enforce org boundaries

## 6. Route Structure (Frontend)

Public:

- `/login`
- `/register`

Authenticated:

- `/select-organization`
- `/`
- `/dashboard`
- `/departments`
- `/donors`
- `/reports`
- `/settings`
- `/admin/organizations` (app admin only)
- `/admin/users` (app admin + org admin)

## 7. API Surface (Backend)

Core routers:

- `/api/auth`
- `/api/organizations`
- `/api/departments`
- `/api/donors`
- `/api/users`

Health:

- `/health`

## 8. Data Migration History

- `20260301_0001_initial`:
  - users, organizations, departments, membership tables
- `20260301_0002_add_donors`:
  - donors table

## 9. Operational Flows

1. User authenticates.
2. User selects organization context.
3. App shell loads with persistent sidebar/header.
4. Feature pages fetch only scoped data.
5. Admin operations are restricted by role and org authority.

## 10. Testing Strategy

Frontend tests:

- Route/auth guard behavior (`AppRouter` suite)
- runner: Vitest + React Testing Library

Backend tests:

- Permission and org-scope tests for users/departments/donors
- CI enforces deprecation hygiene:
  - `pytest -W error::DeprecationWarning -W error::PendingDeprecationWarning`

Recommended execution:

```bash
npm run setup:backend-venv
npm test
npm run test:backend
npm run test:backend:strict
npm run lint
npm run build
```

## 10.1 Dependency Refresh Automation

Monthly Dependabot updates are configured for:

- npm (`/`)
- pip (`/backend`)
- GitHub Actions (`/`)

Toolchain cleanup status:

- frontend linting migrated to ESLint 9 flat config (`eslint.config.js`)
- frontend tests migrated from Jest to Vitest
- `glob@7` deprecation chain from legacy Jest/ESLint tooling removed

## 11. Deployment Model

Frontend:

- static Vite build served by Nginx (Dockerfile included)

Backend:

- FastAPI service with environment-configured DB and CORS

Docker:

- `docker-compose.yml` for local full-stack run

## 12. Current Gaps / Next Engineering Targets

- Add budgets/transactions persistence (currently focused on departments/donors/reporting views)
- Add comprehensive integration tests and seeded test fixtures for CI
- Introduce structured audit logs for admin-level mutations
- Add dedicated production-ready database backend option (PostgreSQL)
