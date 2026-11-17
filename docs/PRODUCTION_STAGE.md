# Fitaval Frontend — Production Stage & Deployment Specification

> **Target Backend API**: `https://partner.fitaval.com/api/v1/crm/`  
> **Base API Root**: `https://partner.fitaval.com/api/v1`  
> **Environment**: Production (`VITE_APP_ENV=production`)  
> **Architecture**: Direct Live API Only (No Mock Layer)

---

## 1. System Overview & Architecture

Fitaval is a unified, single-repository React + Vite application that serves three primary interfaces:
1. **Gym Owner CRM** (`src/crm`): Full gym management interface (Members, Attendance, Plans, Trainers, Finance, Wallet).
2. **Super Admin Panel** (`src/admin`): Multi-tenant oversight, verification, auditing, and gym approval console.
3. **Shared Authentication Portal** (`src/portal`): Role-based entry point dispatching users to either the CRM or Admin dashboard based on their verified JWT token claims.

```
+---------------------------------------------------------------------------------+
|                               FITAVAL FRONTEND                                  |
|                                                                                 |
|   +-------------------+    +--------------------+    +----------------------+   |
|   |   Shared Portal   |    |    Gym CRM App     |    |   Super Admin App    |   |
|   |   (src/portal)    |    |     (src/crm)      |    |     (src/admin)      |   |
|   +---------+---------+    +----------+---------+    +----------+-----------+   |
|             |                         |                         |               |
|             +-------------------------+-------------------------+               |
|                                       |                                         |
|                     +-----------------v-----------------+                       |
|                     |   Shared HTTP Client & Session    |                       |
|                     |     (src/shared/api, auth)        |                       |
|                     +-----------------+-----------------+                       |
+---------------------------------------|-----------------------------------------+
                                        | HTTPS / JSON (Bearer JWT)
                                        v
+---------------------------------------------------------------------------------+
|                       FITAVAL LIVE PRODUCTION BACKEND                           |
|                       https://partner.fitaval.com/api/v1                        |
|                                                                                 |
|   +--------------------+     +--------------------+    +--------------------+   |
|   |   /api/v1/auth/    |     |   /api/v1/crm/     |    |  /api/v1/admin/    |   |
|   |  Login, Register,  |     |  Members, Plans,   |    | Gyms, Verification,|   |
|   |  Token Refresh     |     |  Attendance, Wallet|    | Approvals, Users   |   |
|   +--------------------+     +--------------------+    +--------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 2. Production Environment Configuration

The application runtime is governed by [src/config/env.js](file:///home/bineesh/Projects/fitaval-app/fitaval_frontend/src/config/env.js).

### Configuration Variables (`.env`)

```ini
# Target Django REST Framework production API
VITE_API_BASE_URL=https://partner.fitaval.com/api/v1

# Deployment environment identifier
VITE_APP_ENV=production

# Media / CDN Base URL for uploaded gym visuals & documents
VITE_IMAGE_BASE_URL=https://partner.fitaval.com
```

### URL Normalization & Defensive Routing

Backend endpoints in the CRM module are namespaced under `/crm/` (e.g. `/crm/members/`, `/crm/plans/`). To prevent accidental double-prefixing (e.g., `/crm/crm/members/`), both `env.js` and `httpClient.js` include automated normalization guards:

```javascript
// Automatically normalizes base URLs ending with /crm
if (base.endsWith('/crm')) {
  base = base.slice(0, -4).replace(/\/+$/, '');
}
```

---

## 3. Production API Endpoint Map

All requests are dispatched to `https://partner.fitaval.com/api/v1`:

### 3.1 Authentication & Session (`/auth/`)
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/auth/login/` | `POST` | Authenticates gym owner or super admin; returns JWT access & refresh tokens |
| `/api/v1/auth/register/` | `POST` | Registers new gym partner account |
| `/api/v1/auth/token/refresh/` | `POST` | Rotates access token using stored refresh token |
| `/api/v1/auth/verify-otp/` | `POST` | 2FA / OTP verification |
| `/api/v1/auth/forgot-password/` | `POST` | Initiates password reset flow |
| `/api/v1/auth/reset-password/` | `POST` | Confirms password reset with token |

### 3.2 CRM Modules (`/crm/`)
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/crm/members/` | `GET`, `POST` | Member roster listing, filtering, creation |
| `/api/v1/crm/members/:id/` | `GET`, `PATCH`, `DELETE` | Member profile, plan details, status updates |
| `/api/v1/crm/plans/` | `GET`, `POST` | Membership plan catalog |
| `/api/v1/crm/plans/:id/` | `GET`, `PATCH`, `DELETE` | Plan pricing, duration, features |
| `/api/v1/crm/trainers/` | `GET`, `POST` | Staff / trainer roster management |
| `/api/v1/crm/trainers/:id/` | `GET`, `PATCH`, `DELETE` | Trainer profile, specializations |
| `/api/v1/crm/profile/` | `GET`, `PATCH` | Gym partner profile, branch info, facilities |
| `/api/v1/crm/attendance/` | `GET` | Attendance logs and history |
| `/api/v1/crm/attendance/checkin/` | `POST` | Manual member check-in |
| `/api/v1/crm/attendance/qr_scan/` | `POST` | Dynamic QR code scanner validation |
| `/api/v1/crm/attendance/summary/` | `GET` | Daily/weekly attendance metrics |
| `/api/v1/crm/dashboard/kpi/` | `GET` | Active members, today's check-ins, monthly revenue |
| `/api/v1/crm/dashboard/revenue_chart/` | `GET` | Historical monthly revenue timeline |
| `/api/v1/crm/dashboard/attendance_stats/` | `GET` | Hourly & weekly attendance distribution |
| `/api/v1/crm/wallet/balance/` | `GET` | Current wallet funds & pending payouts |
| `/api/v1/crm/wallet/transactions/` | `GET` | Ledger of credits, debits, and settlements |
| `/api/v1/crm/wallet/payout_request/` | `POST` | Requests withdrawal to verified bank account |
| `/api/v1/crm/notifications/` | `GET` | System alerts and member notifications |

### 3.3 Admin Console (`/admin/`)
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/admin/gyms/` | `GET` | All registered gyms with verification statuses |
| `/api/v1/admin/gyms/:id/` | `GET`, `PATCH` | Gym inspection, edit credentials |
| `/api/v1/admin/gyms/:id/verify/` | `POST` | Approve, verify, or reject gym onboarding |
| `/api/v1/admin/approvals/` | `GET`, `POST` | Payout requests & plan changes approval queue |
| `/api/v1/admin/users/` | `GET`, `POST` | Multi-tenant user directory |

---

## 4. Brand Design Tokens (Production Palette)

The production design system strictly enforces Fitaval's 5-color palette:

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `--color-1` | `#009743` | Primary Brand Green (buttons, links, active states) |
| `--color-2` | `#0F0F0F` | Deep Charcoal (dark backgrounds, card surfaces, headings) |
| `--color-3` | `#063219` | Dark Forest Green (sidebar contrast, hover accents) |
| `--color-4` | `#02B350` | Vibrant Green (success chips, metrics, badges) |
| `--color-5` | `#FFFFFF` | Clean White (text on dark, canvas backgrounds) |

---

## 5. Deployment Options

### Option A: Vercel (Recommended)
Fitaval includes a native [vercel.json](file:///home/bineesh/Projects/fitaval-app/fitaval_frontend/vercel.json) configured for single-page application (SPA) routing:
```bash
# Deploy to Vercel production
vercel --prod
```
Ensure the environment variables (`VITE_API_BASE_URL=https://partner.fitaval.com/api/v1`, `VITE_APP_ENV=production`) are configured in the Vercel Project Settings.

### Option B: Nginx Static Host
Build the static bundle:
```bash
npm run build
```
Copy `dist/` to your web server (e.g., `/var/www/fitaval/html`). Configure Nginx to support HTML5 History API routing:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name partner.fitaval.com app.fitaval.com;

    root /var/www/fitaval/html;
    index index.html;

    # Static assets caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

---

## 6. Pre-Flight Production Checklist

Before triggering a production release, run through this verification checklist:

- [x] **Unit & Integration Tests**: `npm run test` passes (21/21 tests).
- [x] **Linter Cleanliness**: `npm run lint` completes with zero errors.
- [x] **Production Build**: `npm run build` completes successfully.
- [x] **Environment Guard**: `IS_PROD` actively validates that `API_BASE` points to `https://partner.fitaval.com/api/v1` and rejects `127.0.0.1` / `localhost`.
- [x] **Fail-Closed Security**: Mock mode and fixtures removed; all traffic routes strictly to the live Django REST backend.
- [x] **JWT Token Refresh**: Automatic interception and token renewal on HTTP 401 verified.
- [x] **CORS Configuration**: Ensure the backend at `partner.fitaval.com` has allowed the frontend domain (`Access-Control-Allow-Origin`).
