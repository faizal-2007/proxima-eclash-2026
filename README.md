# 🎮 PROXIMA E-CLASH 2026 — Inter-College Esports Championship

Official high-performance collegiate esports tournament portal for **PROXIMA E-CLASH 2026**, organized by **Yenepoya School of Engineering and Technology**, **Yenepoya (Deemed to be University)**.

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Sheets API](https://img.shields.io/badge/Google_Sheets_API-v4-34A853?logo=googlesheets&logoColor=white)](https://developers.google.com/sheets/api)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

---

## 📍 Event Details

- **Host Institution**: Yenepoya School of Engineering and Technology
- **Parent University**: Yenepoya (Deemed to be University)
- **Tournament Date**: Saturday, November 14, 2026 *(1-Day Fest)*
- **Venue Location**: Yenepoya Complex, Balmatta, Mangaluru, Karnataka 575002
- **Total Cash Prize Pool**: ₹7,000

### 🏆 Tournament Disciplines

| Game Discipline | Match Format | Platform | Winner | Runner-up |
| :--- | :--- | :--- | ---: | ---: |
| **Free Fire** | Battle Royale | Mobile Only (No Emulators) | ₹1,000 | ₹500 |
| **BGMI** | Battle Royale | Mobile Only (No Emulators) | ₹1,000 | ₹500 |
| **Mini Militia** | Deathmatch (FFA) | Mobile Only | ₹1,000 | ₹500 |
| **eFootball** | Football Simulation (1v1) | Mobile Only | ₹500 | ₹250 |
| **Carrom** | 1v1 Disc Pot Clash | Mobile / Disc Pool | ₹500 | ₹250 |
| **Ludo** | 4-Player Classic Board | Mobile Only | ₹500 | ₹250 |

The listed awards total ₹6,750. The remaining ₹250 of the announced ₹7,000 pool is unallocated.

---

## ⚡ Key Highlights & Architecture

1. **3D Cinematic Opening Experience**:
   - Spontaneous 2.0-second organic arena loader with live progress ticks.
   - Dual cyber blast doors reveal with smooth perspective dolly forward.
   - Accessible skip button and `prefers-reduced-motion` detection.

2. **Esports Arena Hero Section**:
   - Institutional branding & live countdown timer HUD.
   - 6-layer mouse parallax and dynamic 3D card tilt effects.
   - Interactive discipline selector cards with real-time tournament details.

3. **Tournament Registration & Validation**:
   - Strict server-side and client-side validation.
   - 10-digit Indian mobile number validation (`/^[6-9]\d{9}$/`).
   - Campus ID verification with automatic `@yenepoya.edu.in` email autofill.
   - Campus ID prefix match enforcement (`<campusid>@yenepoya.edu.in`).
   - Honeypot anti-spam protection.

4. **Digital Esports Ticket Pass & Cryptographic QR**:
   - Official Player Credential formatted as `ECL-2026-XXXX`.
   - Real-time cryptographic signed QR token: `<REGISTRATION_ID>.<HMAC-SHA256-HEX>`.
   - Constant-time verification on scan to prevent tampering and forged tickets.
   - Backward-compatible with previous registrations via fallback manual lookup.
   - 1-click high-resolution PNG pass download and direct print dialog.

5. **Serverless Backend & Live Google Sheets Integration**:
   - Vercel Serverless Functions in `/api/*`.
   - Official Google Sheets API v4 integration using Google Service Account JWT.
   - Automatic sheet & tab initialization with frozen headers.
   - Duplicate entry rejection (`409 Conflict`) if Campus ID or Email is already registered.
   - Exponential backoff retry logic for transient API rate limits.

### 📊 Exact Google Sheets Tab & Header Specifications

#### Tab 1: `E-Clash` (Main Registrations)
| Col | Header Name | Format / Example | Description |
|:---|:---|:---|:---|
| A | `Registration ID` | `ECL-2026-0001` | Sequential unique identifier |
| B | `Timestamp (UTC)` | `2026-10-14T09:00:00.000Z` | Registration time in UTC ISO format |
| C | `Timestamp (IST)` | `14 Oct 2026, 2:30:00 pm` | Local Indian Standard Time |
| D | `Full Name` | `Rahul Sharma` | Verified student participant name |
| E | `Phone Number` | `9876543210` | 10-digit Indian mobile number |
| F | `Campus ID` | `11111` | Yenepoya University student ID |
| G | `Campus Email` | `11111@yenepoya.edu.in` | Validated institutional email |
| H | `Academic Year` | `1st Year` / `2nd Year` | Academic year cohort |
| I | `Tournament Game` | `Free Fire` / `BGMI` / `Mini Militia` / `eFootball` | Chosen esports tournament |
| J | `Status` | `CONFIRMED` | Registration state |
| K | `Checked In` | `TRUE` / `FALSE` | Check-in verification status |
| L | `Checked In At` | `2026-11-14T09:15:22.000Z` | ISO timestamp of check-in |
| M | `Checked In By` | `VOL-001 (Karthik H)` | ID and name of the checking volunteer |
| N | `Payment UTR` | Legacy field | Retained for existing admin integrations |
| O | `Payment Screenshot` | Legacy field | Retained for existing admin integrations |
| P | `Payment Status` | Legacy field | Retained for existing admin integrations |
| Q | `Paid At` | Legacy field | Retained for existing admin integrations |
| R | `Amount` | `49` | Server-configured entry fee in INR |
| S | `Payment Mode` | `UPI_MANUAL` | Manual UPI payment |
| T | `UTR` | 12-digit UPI reference | Student-submitted transaction reference |
| U | `Screenshot URL` | Unlisted Vercel Blob URL | Payment proof image |
| V | `Paid At (submitted time)` | ISO timestamp | Time the proof was submitted |
| W | `Verification Status` | `UNVERIFIED` / `VERIFIED` / `REJECTED` | Organizer review status; empty legacy values are treated as `VERIFIED` |
| X | `Verified By` | Admin identity | Reviewer who changed the verification status |
| Y | `Verified At` | ISO timestamp | Time the organizer reviewed the payment |
| Z | `Note` | Text | Organizer note or rejection reason |

The existing columns A–Q are retained for backwards compatibility. The nine manual-payment fields above are appended after them in exactly this order.

#### Tab 4: `Payments` (Append-Only Payment Audit)
| Col | Header Name |
|:---|:---|
| A | `Timestamp` |
| B | `Event` (`SUBMITTED`, `VERIFIED`, `REJECTED`, `REVOKED`, `DUPLICATE_UTR_BLOCKED`) |
| C | `Registration ID` |
| D | `Campus ID` |
| E | `UTR` |
| F | `Actor` |
| G | `Note` |

#### Tab 2: `Volunteers` (Volunteer Accounts)
| Col | Header Name | Description |
|:---|:---|:---|
| A | `Volunteer ID` | Unique ID (e.g. `VOL-001`) |
| B | `Name` | Volunteer's full name |
| C | `Username` | Lowercase login handle (e.g. `karthik_h`) |
| D | `Password Hash` | bcryptjs salt-hashed password |
| E | `Role` | `volunteer` or `lead` |
| F | `Station` | Default assigned game station or `All` |
| G | `Active` | Account status (`TRUE` / `FALSE`) |
| H | `Created At` | ISO timestamp of creation |

#### Tab 3: `CheckInLog` (Append-Only Audit Log)
| Col | Header Name | Description |
|:---|:---|:---|
| A | `Timestamp` | ISO timestamp of event |
| B | `Registration ID` | Participant's ticket ID |
| C | `Game` | Registered tournament game |
| D | `Result` | `CHECKED_IN`, `ALREADY_CHECKED_IN`, `WRONG_STATION_OVERRIDE`, `INVALID`, `UNDO` |
| E | `Volunteer ID` | ID of the acting volunteer |
| F | `Volunteer Name` | Name of the volunteer |
| G | `Station` | Station selected at time of scan |
| H | `Note` | Audit context or override rationale |

6. **Password-Protected Admin Command Center (`/#admin`)**:
   - Secure passkey entry (**Passkey**: `yennex2026`).
   - Live KPI counters: Total Players, Free Fire, BGMI, Mini Militia, eFootball.
   - Real-time player search by Name, Campus ID, Mobile, or Registration ID.
   - Filter by discipline and academic year.
   - 1-click **Export to CSV** for instant spreadsheet download.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm or pnpm

### 2. Installation
```bash
git clone <repository-url>
cd "Proxivent #01"
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to [`.env.example`](.env.example)):
```env
# Google Spreadsheet ID
GOOGLE_SHEET_ID="your_google_sheet_id_here"
GOOGLE_SHEET_TAB_NAME="E-Clash"

# Google Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-bot@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Admin Portal Passkey
ADMIN_SECRET_KEY="yennex2026"

# Cryptographic QR Ticket Signing Secret
QR_SECRET="replace_with_a_unique_random_secret_at_least_32_characters"

# Vercel Blob read/write token for payment proof screenshots
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"

# Volunteer Session JWT Secret
VOLUNTEER_JWT_SECRET="proxima-volunteer-jwt-secret-key-2026-production"
```

*(Alternatively, place your downloaded Google Cloud service account JSON file in the project root as `service-account.json`)*.

### 4. Running the Project
```bash
# Start local development server (with full /api serverless middleware)
npm run dev

# Or build and launch the production preview server
npm run build
npm run preview
```

### 5. Diagnostics & Verification
```bash
# Verify Google Sheets API connection and write permissions
npm run verify:sheets

# Run the backend serverless API unit test suite (5 tests)
npm run test:api

# Run linter
npm run lint
```

---

## 🚀 Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. Import your project into [Vercel](https://vercel.com/new).
3. In the Vercel project settings, configure the following **Environment Variables**:
   - `GOOGLE_SHEET_ID`: Your Google Spreadsheet ID.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Your service account client email.
   - `GOOGLE_PRIVATE_KEY`: Your service account private key (including `BEGIN`/`END` lines).
   - `BLOB_READ_WRITE_TOKEN`: Read/write token for the Vercel Blob store used for payment screenshots.
   - `QR_SECRET`: A unique, random secret of at least 32 characters. Do not reuse a sample value.
   - `ADMIN_SECRET_KEY`: `yennex2026`
4. Click **Deploy**. Vercel will automatically build the client bundle and deploy the serverless functions in `/api/`.

---

## 🔒 Admin Access
- Navigate to `https://your-domain.vercel.app/#admin` (or click "Admin" in the footer).
- Enter passkey: **`yennex2026`** to access the live registrations command center and CSV export.

---

## 🏛️ Credits & Copyright

© 2026 **Yenepoya School of Engineering and Technology**, **Yenepoya (Deemed to be University)**. All rights reserved.  
Crafted for the collegiate esports champions of Mangaluru.
