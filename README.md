# ?? PROXIMA E-CLASH 2026

> **Inter-College Esports Championship** � Yenepoya (Deemed to be University)
> *Where Virtual Worlds Become Battlefields.*

A full-stack event management web application built for **PROXIMA E-CLASH 2026**, a 1-day mega esports festival hosted at Yenepoya School of Engineering and Technology, Mangaluru on **October 26, 2026**.

---

## ?? Tournament Overview

| Detail | Info |
|---|---|
| **Event** | PROXIMA E-CLASH 2026 |
| **Type** | Inter-College Esports Championship |
| **Date** | Monday, October 26, 2026 |
| **Venue** | Yenepoya Complex, Balmatta, Mangaluru, Karnataka 575002 |
| **Entry Fee** | ?49 per player (non-refundable) |
| **Total Prize Pool** | ?7,000 |
| **Technical Admin** | Mohammed Faizal |

### ??? Games & Prize Breakdown

| Game | Mode | Prize (1st / 2nd) |
|---|---|---|
| **Free Fire** | Battle Royale (Mobile) | ?1,000 / ?500 |
| **BGMI** | Battle Royale (Mobile) | ?1,000 / ?500 |
| **Mini Militia** | Deathmatch FFA (Mobile) | ?1,000 / ?500 |
| **eFootball** | Football 1v1 (Mobile) | ?500 / ?250 |
| **Carrom** | 1v1 Disc Pot (Mobile) | ₹500 / ₹250 |

---

## ? Features Built

### ?? Public Landing Page
- **3D Cinematic Intro Overlay** � Full-screen animated opening experience with skip option and replay button in footer; auto-skips for returning visitors (stored in `sessionStorage`)
- **Split Hero Section** � Parallax esports arena hero with live countdown to event date, glowing game badges, and a "Register Now" CTA
- **Landing Sections:**
  - **About** � Event overview with prize pool and student eligibility info
  - **Games** � Interactive cards for all 5 games with prize details, format, and max player counts
  - **Schedule** � Full day-of-event timeline from 9:00 AM to 3:45 PM
  - **Prizes** � Champions, runner-up, and MVP prize breakdown
  - **Rules / FAQ** � Expandable FAQ covering eligibility, devices, payment, and pass delivery
  - **Contact** � Technical admin contact details and social links
- **Navbar** � Sticky navigation with smooth scroll to all landing sections, volunteer portal link, and admin access
- **Footer** � Full footer with event details, quick links, and intro replay button

### ?? Registration System
- **Multi-step registration flow:** Player details ? Game selection ? Payment ? Confirmation
- **Form auto-save** � Draft form state persisted to `sessionStorage` across refreshes
- **Game selection** � Grouped by category (Battle Royale / Board Games); single-game entry enforced via config
- **UPI payment flow:**
  - Displays live UPI QR code (`/public/payment/upi-qr.jpeg`)
  - UPI ID with one-click copy
  - Payment screenshot upload with client-side **image compression** (Canvas API)
  - UTR (transaction reference) input and validation
- **Honeypot bot protection** on the registration form
- **Ticket Recovery** � Players can re-fetch their pass by entering Campus ID
- **Post-registration:** Confetti burst + auto-navigate to `SuccessPage`

### ?? Digital Player Pass (Ticket)
- Generated immediately on successful registration
- Contains: Player name, Campus ID, game, Registration ID, event date/venue
- **HMAC-SHA256 signed QR code** � Cryptographically secure, tamper-evident
- Downloadable as image via `TicketPass` component
- QR code is scannable by the Volunteer Scanner system

### ??? Admin Command Center (`#admin`)
- **Passkey-protected** � Session-based admin token stored in `sessionStorage`
- **Registrations Tab:**
  - Live stats dashboard: Total, checked-in, pending, per-game breakdown
  - Full searchable, filterable registrations table (by name, campus ID, game, year)
  - View payment screenshot proofs directly in the dashboard
  - **Delete registrations** with confirmation modal
  - CSV export of all registrations
- **Volunteers Tab (`VolunteersManager`):**
  - Create new volunteer accounts (name, username, password, role, station)
  - View all volunteers with their status, role, and assigned station
  - Activate / deactivate volunteers
  - Reset volunteer passwords
  - Delete volunteer accounts
- **Check-ins Tab (`CheckInsViewer`):**
  - Full audit log of all QR scan events with timestamps
  - Shows volunteer who performed each scan, station, and result
  - Filterable by result type: `CHECKED_IN`, `ALREADY_CHECKED_IN`, `INVALID`, `WRONG_STATION_OVERRIDE`

### ?? Volunteer Portal
- **`VolunteerLoginPage`** � JWT-authenticated login using Campus ID & password; 12-hour session with token expiry detection
- **`VolunteerScannerDashboard`:**
  - **Camera QR Scanner** � Uses `html5-qrcode` library for real-time camera-based QR scanning
  - **Manual Search Modal** � Text search by name or Registration ID for players without QR access
  - **Scan Result Card** � Shows player details, game, check-in status; supports override for wrong-station scans
  - **Station Stats HUD** � Live per-station scan count, last scan time, and success rate
  - **Audio Feedback** � Distinct audio cues for success, already-checked-in, and invalid QR scans
  - **Offline Queue** � Queues scan events when offline and auto-syncs when network returns
- **`VolunteerHistoryPage`** � Personal scan history for the logged-in volunteer with filters

---

## ??? Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite 8 |
| **Styling** | Tailwind CSS v3 |
| **Animations** | Framer Motion 14 |
| **Icons** | Lucide React |
| **QR Scanning** | html5-qrcode |
| **QR Generation** | qrcode (npm) |
| **Confetti** | canvas-confetti |
| **Backend / Serverless** | Vercel Serverless Functions (Node.js) |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Vercel Blob (payment screenshots) |
| **Auth (Volunteers)** | JWT (`jsonwebtoken`) + `bcryptjs` |
| **Linter** | OxLint |
| **Deployment** | Vercel |

---

## ?? Project Structure

```
proxima-eclash-2026/
+-- api/
�   +-- [...path].js              # Unified API router (Vercel catch-all)
�   +-- _lib/
�   �   +-- supabase.js           # Supabase client + all DB query helpers
�   �   +-- auth.js               # Admin & volunteer JWT auth middleware
�   �   +-- crypto.js             # HMAC-SHA256 QR signature utils
�   �   +-- paymentValidation.js  # UTR + payment proof validation logic
�   �   +-- rateLimit.js          # In-memory rate limiter for API endpoints
�   +-- _handlers/
�       +-- health.js             # GET /api/health � DB health check
�       +-- ticket.js             # GET /api/ticket � ticket recovery by campus ID
�       +-- register/
�       �   +-- index.js          # Registration entrypoint
�       �   +-- eclash.js         # POST /api/register/eclash � main registration handler
�       �   +-- payment.js        # POST /api/register/payment � payment record creation
�       �   +-- manualPayment.js  # POST /api/register/manual � admin manual payment entry
�       +-- admin/
�       �   +-- login.js          # POST /api/admin/login � admin passkey auth
�       �   +-- registrations.js  # GET/DELETE /api/admin/registrations
�       �   +-- volunteers.js     # CRUD /api/admin/volunteers
�       �   +-- checkins.js       # GET /api/admin/checkins � check-in audit logs
�       +-- volunteer/
�           +-- login.js          # POST /api/volunteer/login � JWT issue
�           +-- me.js             # GET /api/volunteer/me � current volunteer profile
�           +-- scan.js           # POST /api/volunteer/scan � QR scan + check-in
�           +-- checkin.js        # POST /api/volunteer/checkin � manual check-in
�           +-- search.js         # GET /api/volunteer/search � player search
�           +-- stats.js          # GET /api/volunteer/stats � station stats
�           +-- history.js        # GET /api/volunteer/history � volunteer scan history
+-- src/
�   +-- App.jsx                   # Root app + hash-based SPA router
�   +-- main.jsx                  # React entry point
�   +-- config/
�   �   +-- eventConfig.js        # All event data: games, schedule, prizes, FAQ, metadata
�   +-- pages/
�   �   +-- RegistrationPage.jsx  # Full registration wizard (details ? game ? payment ? confirm)
�   �   +-- SuccessPage.jsx       # Post-registration success with confetti
�   �   +-- AdminDashboard.jsx    # Admin command center (registrations, volunteers, check-ins)
�   �   +-- VolunteerLoginPage.jsx
�   �   +-- VolunteerScannerDashboard.jsx
�   �   +-- VolunteerHistoryPage.jsx
�   +-- components/
�   �   +-- Navbar.jsx
�   �   +-- SplitHero.jsx         # Hero with countdown + parallax
�   �   +-- LandingSections.jsx   # About, Games, Schedule, Prizes, FAQ, Contact
�   �   +-- Footer.jsx
�   �   +-- Intro3DOverlay.jsx    # 3D cinematic opening animation
�   �   +-- HeroArtworkLayers.jsx # Parallax hero background layers
�   �   +-- TicketPass.jsx        # Digital player pass + QR code
�   �   +-- TicketRecoveryForm.jsx
�   �   +-- RegistrationSteps.jsx # Step indicator component
�   �   +-- admin/
�   �   �   +-- VolunteersManager.jsx
�   �   �   +-- CheckInsViewer.jsx
�   �   +-- volunteer/
�   �       +-- CameraScanner.jsx
�   �       +-- ManualSearchModal.jsx
�   �       +-- ScanResultCard.jsx
�   �       +-- StationStatsHud.jsx
�   +-- utils/
�       +-- volunteerAuth.js       # JWT storage, decode, expiry check helpers
�       +-- audioFeedback.js       # Web Audio API scan sound effects
�       +-- compressPaymentImage.js# Canvas-based image resize + compression
�       +-- offlineQueue.js        # IndexedDB offline scan queue + sync
+-- supabase/
�   +-- schema.sql                # Full PostgreSQL schema + RLS policies
+-- scripts/
�   +-- seed-volunteers.js        # Bulk volunteer account seeder
�   +-- verify-supabase.js        # DB connection health check script
�   +-- clear-checkin-logs.js     # Dev utility: clears checkin_logs table
+-- public/
�   +-- payment/
�       +-- upi-qr.jpeg           # UPI QR code for payment
+-- .env.example                  # Environment variable template
+-- vercel.json                   # Vercel deployment config (rewrites + headers)
+-- vite.config.js                # Vite build config
+-- tailwind.config.js            # Tailwind custom theme
+-- package.json
```

---

## ??? Database Schema (Supabase PostgreSQL)

### `registrations`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `registration_id` | TEXT | Unique ID (e.g., `ECL-2026-A1B2`) |
| `full_name` | TEXT | Player's full name |
| `phone` | TEXT | Contact number |
| `campus_id` | TEXT | Yenepoya Campus ID |
| `campus_email` | TEXT | `@yenepoya.edu.in` email |
| `year` | TEXT | `1st Year` / `2nd Year` |
| `game` | TEXT | Selected game |
| `checked_in` | BOOLEAN | Check-in status |
| `checked_in_at` | TIMESTAMPTZ | Check-in timestamp |
| `checked_in_by` | TEXT | Volunteer ID who checked in |
| `payment_utr` | TEXT | UPI transaction reference |
| `payment_screenshot` | TEXT | Blob URL of proof screenshot |
| `payment_status` | TEXT | `PENDING` / `VERIFIED` |
| `amount` | NUMERIC | Entry fee (?49) |
| `status` | TEXT | `CONFIRMED` |

### `volunteers`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `volunteer_id` | TEXT | Unique volunteer ID |
| `name` | TEXT | Full name |
| `username` | TEXT | Campus ID (lowercase) |
| `password_hash` | TEXT | bcrypt-hashed password |
| `role` | TEXT | `volunteer` / `lead` |
| `station` | TEXT | Assigned game station |
| `active` | BOOLEAN | Account active status |

### `checkin_logs`
Immutable audit log of every QR scan event � stores result, volunteer, station, and timestamp.

### `payment_audit_logs`
Audit trail for all payment-related events (creation, verification, rejection).

> **Row-Level Security (RLS)** is enabled on all tables. All backend operations use the `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS safely.

---

## ?? API Routes

All routes are served by the Vercel catch-all at `api/[...path].js`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Database + service health check |
| `POST` | `/api/register/eclash` | New player registration |
| `POST` | `/api/register/payment` | Record UPI payment |
| `GET` | `/api/ticket` | Recover ticket by Campus ID |
| `POST` | `/api/admin/login` | Admin passkey authentication |
| `GET` | `/api/admin/registrations` | List all registrations + stats |
| `DELETE` | `/api/admin/registrations` | Delete a registration |
| `GET/POST/PUT/DELETE` | `/api/admin/volunteers` | Full volunteer CRUD |
| `GET` | `/api/admin/checkins` | Fetch check-in audit logs |
| `POST` | `/api/volunteer/login` | Volunteer login + JWT issue |
| `GET` | `/api/volunteer/me` | Get current volunteer profile |
| `POST` | `/api/volunteer/scan` | Process QR code scan + check-in |
| `POST` | `/api/volunteer/checkin` | Manual check-in by registration ID |
| `GET` | `/api/volunteer/search` | Search players by name/campus ID |
| `GET` | `/api/volunteer/stats` | Station scan statistics |
| `GET` | `/api/volunteer/history` | Volunteer personal scan history |

---

## ?? Security

- **Admin auth:** Passkey compared against `ADMIN_SECRET_KEY` env variable; session stored in `sessionStorage`
- **Volunteer auth:** `bcryptjs` password hashing + `jsonwebtoken` (12-hour expiry)
- **QR integrity:** Each ticket QR contains an HMAC-SHA256 signature (keyed by `QR_SECRET`) � invalid or tampered QRs are rejected at scan time
- **Rate limiting:** In-memory rate limiter on all API endpoints
- **Honeypot field:** Hidden field on registration form to catch bots
- **RLS:** All Supabase tables have Row-Level Security enabled; direct client access is blocked

---

## ?? Local Development Setup

### 1. Clone & Install
```bash
git clone <repo-url>
cd "Proxima E-Clash 2026"
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Fill in your values:
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# ADMIN_SECRET_KEY, QR_SECRET, VOLUNTEER_JWT_SECRET
# BLOB_READ_WRITE_TOKEN
```

### 3. Set Up Supabase Database
1. Create a free project at https://supabase.com
2. Open the SQL Editor in your Supabase dashboard
3. Run the contents of `supabase/schema.sql`
4. Verify connection: `npm run verify:supabase`

### 4. Seed Volunteer Accounts (Optional)
```bash
npm run seed:volunteers
```

### 5. Start Dev Server
```bash
npm run dev
```

> For local API testing, use the Vercel CLI: `npx vercel dev`

---

## ?? NPM Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start local dev server |
| `build` | `vite build` | Build production bundle to `dist/` |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `oxlint` | Run OxLint linter |
| `verify:supabase` | `node scripts/verify-supabase.js` | Test Supabase DB connection |
| `seed:volunteers` | `node scripts/seed-volunteers.js` | Bulk-create volunteer accounts |
| `clear:logs` | `node scripts/clear-checkin-logs.js` | Clear check-in logs (dev only) |

---

## ?? Deployment (Vercel)

The app is configured for one-click Vercel deployment.

```bash
npx vercel --prod
```

**`vercel.json` handles:**
- API catch-all rewrite: `GET /api/*` ? `api/[...path].js`
- SPA fallback rewrite: all non-API routes ? `index.html`
- CORS headers on all `/api/*` routes
- Long-lived cache headers on `/assets/*` (JS/CSS bundles)

**Required Vercel Environment Variables** (set in Vercel dashboard):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
ADMIN_SECRET_KEY
QR_SECRET
VOLUNTEER_JWT_SECRET
BLOB_READ_WRITE_TOKEN
```

---

## ??? App Navigation (Hash-based SPA Router)

| URL Hash | View |
|---|---|
| `/` or `#home` | Public landing page |
| `#register` | Registration wizard |
| `#admin` | Admin Command Center (passkey-protected) |
| `#volunteer/login` | Volunteer login |
| `#volunteer` or `#volunteer/scanner` | Volunteer Scanner Dashboard (JWT-protected) |
| `#volunteer/history` | Volunteer scan history (JWT-protected) |

---

## ?? Contact

| Role | Name | Contact |
|---|---|---|
| Technical Admin | Mohammed Faizal | +91 99001 66140 |
| Email | | eclash2026@yenepoya.edu.in |
| Instagram | | @proxima_esports |

---

*Built with love for Yenepoya School of Engineering and Technology � PROXIMA 2026*
