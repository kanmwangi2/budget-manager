# Cheetah Budgeting User Guide

Last updated: March 1, 2026

## 1. What This App Does

Cheetah Budgeting is a multi-organization budget management app for non-profits with:

- role-based access (`app_admin`, `org_admin`, `user`)
- organization-scoped data access
- department management
- donor management
- report exports
- user and organization administration

## 2. Access and Roles

- `app_admin`
  - global access across all organizations
  - can manage organizations and users
- `org_admin`
  - administrative access only for organizations they administrate
  - can manage users/departments/donors in those organizations
- `user`
  - scoped access to assigned organizations and departments
  - no access to admin pages

## 3. Login and Organization Selection

After login, all users are taken to **Select Organization**.

- users can only choose organizations assigned to them
- app admins can choose any organization and create new organizations
- selected organization defines data scope for the active session

Use **top-right profile menu -> Switch Organization** to change context.

## 4. Main Navigation

Left navigation includes:

- Dashboard
- Departments
- Donors
- Reports

Top-right profile menu includes:

- Settings
- Admin Page (only for admins)
- Switch Organization
- Log out

## 5. Core Workflows

### 5.1 Departments

- View organization departments
- Search/filter departments
- Admins can create, edit, and delete departments

### 5.2 Donors

- View donors within active organization
- Search/filter donors by text and status
- Admins can create, edit, and delete donors

### 5.3 Reports

- View organization-level donor and department analytics
- Export report data to CSV

### 5.4 Settings

- Update profile name
- Set theme/currency/language
- Configure notification preferences
- Trigger password reset email flow

### 5.5 Administration

Admins can access administration from the profile menu:

- **Organization Management** (`app_admin` only)
- **User Management** (`app_admin` and `org_admin`)

User management supports:

- create/update/delete users
- role assignment
- organization assignment
- department assignment
- activation/deactivation

## 6. Local Development

## 6.1 Prerequisites

- Node.js + npm
- Python 3.11+ (3.13 works)

## 6.2 Frontend Setup

```bash
npm install
cp .env.example .env
```

Set:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Run:

```bash
npm run dev:web
```

## 6.3 Backend Setup

Preferred (creates and uses `backend/.venv` automatically):

```bash
npm run setup:backend-venv
```

Then run backend commands from root:

```bash
npm run db:migrate
npm run dev:api
```

Manual alternative:

```bash
cd backend
python -m pip install -r requirements.txt
copy .env.example .env
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## 6.4 Run Both

```bash
npm run dev
```

## 7. Testing and Quality Checks

Frontend tests:

```bash
npm test
```

Backend API permission tests:

```bash
npm run test:backend
```

Strict backend tests (deprecations fail the run):

```bash
npm run test:backend:strict
```

Lint + build:

```bash
npm run lint
npm run build
```

## 8. Troubleshooting

- `Failed to fetch` usually means API is down or CORS mismatch.
- Ensure backend is running on `http://localhost:8000`.
- Ensure frontend points to `http://localhost:8000/api`.
- Run migrations if API fails on missing tables:

```bash
cd backend
python -m alembic upgrade head
```

## 9. Dependency Maintenance

Dependency updates are automated monthly via Dependabot for:

- npm packages
- backend Python packages
- GitHub Actions workflows

Notes:

- frontend tooling has been migrated to `vitest` and `eslint@9` flat config.
- `glob@7` deprecation warnings from legacy `jest@29` / `eslint@8` chains are removed.
