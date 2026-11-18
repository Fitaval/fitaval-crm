# Fitaval — Frontend Application

> **One program, one login, two apps.**  
> Fitaval combines a modern Gym Management CRM (`src/crm`) and an enterprise Super Admin Panel (`src/admin`) behind a unified authentication gateway (`src/portal`), powered by React 18, Vite, and Tailwind CSS.

---

## 1. Architecture Overview

After signing in, the account's role dynamically routes to the appropriate application:

| Role | Application | Served Path | Source Directory | Primary Purpose |
|---|---|---|---|---|
| **Gym Owner / Staff** | **CRM** | `/` | `src/crm/` | Gym operations, members, attendance, plans, trainers, wallet |
| **Super Admin** | **Admin Panel** | `/admin` | `src/admin/` | Platform-wide gym oversight, approvals, users, audit, finance |
| **Unauthenticated** | **Portal** | `/login` | `src/portal/` | Shared authentication shell (login, register, password recovery) |

* **Style Isolation:** Each application maintains its own isolated styling context (`tailwind.crm.config.js` and `tailwind.admin.config.js`) with dedicated CSS stylesheets.
* **Code Splitting:** Only the active application bundle is loaded via `React.lazy()` chunks.
* **Security & In-Memory Tokens:** Active access tokens are cached in runtime memory (`src/shared/auth/tokenManager.js`) to defend against XSS extraction, with session isolation scoped per browser tab in `sessionStorage`.
* **Centralized Resilient HTTP Client:** All backend communication routes through `src/shared/api/httpClient.js` with Bearer token injection, request timeouts (15s), automatic 401 token refresh queue & request replay, and normalized `ApiError` structures.

---

## 2. Environment Configuration & Security Policy

Fitaval connects directly to the live Django REST Framework backend API (`https://api.fitaval.com/api/v1`):

* **Live API Only:** All mock data and simulated endpoints have been completely removed from the codebase. All authentication and data fetching strictly query the backend API.
* **Production Guards:** `VITE_API_BASE_URL` is mandatory in production and automatically rejects `localhost` or `127.0.0.1`. If production environment variables are missing or insecure, the application halts startup immediately with a `ConfigErrorScreen`.

### 2.1 Configuration (`.env`)

Fitaval uses a single `.env` file configured for the target backend:

```env
VITE_API_BASE_URL=https://api.fitaval.com/api/v1
VITE_APP_ENV=production
VITE_IMAGE_BASE_URL=https://api.fitaval.com
```

---

## 3. Quick Start & Developer Entry Guide

### Prerequisites
* **Node.js:** v20.0.0 or higher (v22 LTS recommended)
* **Package Manager:** `npm` v9+ (or `pnpm` / `yarn`)

### 3.1 Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/fitaval/fitaval-frontend.git
cd fitaval-frontend
npm install
```

### 3.2 Local Development Server
Start the Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open your browser at **`http://localhost:5173`**.

---

## 4. Linting, Testing & CI Pipeline

### 5.1 Code Quality & Linting
Fitaval enforces strict code standards using ESLint 9 with React and React Hooks plugins:
```bash
# Check for lint errors
npm run lint

# Automatically fix autofixable issues
npm run lint:fix
```

### 5.2 Executing Automated Tests
Fitaval uses **Vitest** and **JSDOM** with test coverage across environment validation, token lifecycle, HTTP interceptors, 401 token refresh queue, and authentication flows:
```bash
# Run unit & integration test suite
npm run test

# Run tests in interactive watch mode
npm run test:watch
```

### 5.3 Continuous Integration (CI)
GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `master`/`main`:
1. Sets up Node.js 22 LTS with dependency caching.
2. Runs code quality and lint check (`npm run lint`).
3. Executes Vitest automated test suite (`npm run test`).
4. Compiles production bundle with fail-closed validation (`npm run build`).

---

## 6. Building for Production & Deployment

### 6.1 Production Build
Compile and minify all client assets into the `dist/` directory:
```bash
npm run build
```

### 6.2 Preview Production Build Locally
Verify the production build locally before deploying:
```bash
npm run preview
```

### 6.3 Deployment Targets
* **Vercel / Netlify:** Build command `npm run build`, publish directory `dist`. Configure `VITE_API_BASE_URL` in environment settings.
* **Docker / Nginx:** Serve the generated `dist/` folder using Nginx with SPA fallback: `try_files $uri $uri/ /index.html;`.

---

## 7. Project Directory Map

```
fitaval/
├── src/
│   ├── config/            # Environment validation & fail-fast guards (env.js)
│   ├── portal/            # Shared auth shell & gateway (Portal.jsx, Login.jsx, session.js)
│   ├── crm/               # Gym Owner CRM (@/ aliases resolve here)
│   │   ├── pages/         # Dashboard, Members, Finance, Plans, Trainers, Wallet...
│   │   ├── components/    # Layout, StatCard, QrScannerDialog, UI primitives...
│   │   ├── lib/           # AuthContext, QueryClient, theme provider...
│   │   └── index.css      # CRM-specific design tokens
│   ├── admin/             # Super Admin application
│   │   ├── pages/         # Dashboard, GymManagement, GymDetail, UserManagement...
│   │   ├── components/    # DataTable, Sheet, Modal, ScannerModal, Visuals...
│   │   ├── context/       # AppContext (central reactive store)
│   │   └── index.css      # Admin-specific design tokens
│   ├── shared/            # Cross-application infrastructure
│   │   ├── api/           # Centralized resilient HTTP client (httpClient.js)
│   │   ├── auth/          # In-memory JWT & tab session manager (tokenManager.js)
│   │   └── verified.js    # Blue tick gym verification state helper
│   ├── test/              # Vitest setup & testing utilities
│   └── main.jsx           # Application entrypoint
├── docs/                  # Comprehensive architecture & API documentation
│   ├── PROJECT_OVERVIEW.md# High-level architecture & three client applications
│   ├── FRONTEND_ANALYSIS.md# React components, forms, fields & UI requirements
│   ├── BACKEND_IMPLEMENTATION_PLAN.md# Django apps, endpoint mapping & milestones
│   ├── DESIGN_SYSTEM.md   # Design System & UI Style Guide (colors, type, Storybook)
│   ├── STATE_AND_ROUTING.md# State architecture, navigation flowchart & data pipeline
│   ├── CRM_API.md         # Full REST API specification for CRM operations
│   ├── ADMIN_API.md       # Full REST API specification for Super Admin operations
│   └── API_DOCS.md        # Unified API documentation & error codes
├── scripts/               # Compatibility utilities & build helpers
├── tailwind.crm.config.js # CRM Tailwind configuration
├── tailwind.admin.config.js# Admin Tailwind configuration
├── vite.config.js         # Vite bundler & Vitest test runner configuration
└── package.json           # Scripts and dependencies
```

---

## 8. Documentation Directory

For in-depth guides, consult the dedicated documentation files:

* 🏛️ [**Project Overview & Three Client Apps**](docs/PROJECT_OVERVIEW.md) — Architectural vision, Portal/CRM/Admin breakdown, lazy-loading chunks, and security model.
* ⚛️ [**Frontend Analysis & Form Specifications**](docs/FRONTEND_ANALYSIS.md) — Comprehensive audit of all React components, forms, validation rules, input fields, and UX states.
* 🐍 [**Backend Implementation Plan (Django REST)**](docs/BACKEND_IMPLEMENTATION_PLAN.md) — Domain-driven Django apps, models, 1:1 endpoint-to-client mapping, multi-tenant scoping, and phased implementation order.
* 🎨 [**Design System & Style Guide**](docs/DESIGN_SYSTEM.md) — Color tokens, typography, Tailwind grids, and component states.
* 🧭 [**State & Routing Architecture**](docs/STATE_AND_ROUTING.md) — Navigation flowchart, client-side route map, React contexts, and data flow pipelines.
* 🏋️ [**CRM REST API Documentation**](docs/CRM_API.md) — Complete endpoint reference for member check-in, plans, trainers, and wallet settlements.
* 🛡️ [**Super Admin REST API Documentation**](docs/ADMIN_API.md) — Complete endpoint reference for multi-gym oversight, approvals, audit logs, and payouts.

---

*© 2026 Fitaval. All rights reserved.*
