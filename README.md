# TinyPayroll

> Dead-simple attendance tracking and monthly payroll for small businesses (5–50 employees).

TinyPayroll is a full-stack payroll app aimed at small business owners — bakeries, traders, small retail, service shops — who need to mark attendance, run payroll once a month, and hand out payslips without a finance team or a DBA. It is a **React Native / Expo** mobile app backed by a **Spring Boot** REST API.

- **Mobile app** — Expo 54, expo-router, React 19, Tamagui. Runs on Android, iOS, and web from one codebase.
- **Backend** — Spring Boot 4 (Java 21), PostgreSQL, JWT auth, multi-tenant, in `backend/`.

---

## Table of contents

- [What it does](#what-it-does)
- [Screenshots / screens](#screens)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Run the backend](#1-run-the-backend)
  - [2. Run the mobile app](#2-run-the-mobile-app)
  - [Pointing the app at the backend](#pointing-the-app-at-the-backend)
- [Design system — "Calm Precision"](#design-system--calm-precision)
- [Salary formula](#salary-formula)
- [Building an installable Android APK](#building-an-installable-android-apk)
- [Project conventions](#project-conventions)
- [Further documentation](#further-documentation)
- [Roadmap](#roadmap)

---

## What it does

| Feature | Description |
|---|---|
| **Authentication** | Email + password signup/login. Signup creates a business (tenant) and its owner in one step. JWT access + refresh tokens, stored securely on-device. A `401` from any API call drops you straight back to the login screen. |
| **Employees** | Add, view, edit, and delete (soft-delete) employees. Each carries role, salary type (monthly/daily), base salary, join date, phone, and bank details. |
| **Attendance** | Month calendar. Tap a day to cycle a status: present → absent → leave → holiday. Marks are upserted per employee per day. |
| **Payroll runs** | Create a draft run for a month — it auto-seeds line items from attendance (absent days become unpaid-leave deductions). Adjust overtime/bonus/advances/deductions per employee, then finalize to lock it as **Paid**. |
| **Payslips** | Per-run, per-employee payslip. Export to PDF, share via the native share sheet, or open a prefilled WhatsApp chat with the employee. |
| **Reports** | Year-to-date expense trend, per-period totals, and employee-cost breakdown. Export as CSV or PDF. |
| **Business config** | Company profile + payroll settings (pay day, working days/month, OT rate, currency) and feature toggles (auto reminders, WhatsApp payslips). |
| **Dark mode** | Every screen fully supports light and dark, driven by the device color scheme. |

Multi-tenant by design: every signed-up business is an isolated tenant, and `businessId` is always derived from the JWT — never trusted from the request.

---

## Screens

All screens are built and support both light and dark mode.

| Screen | Route | Purpose |
|---|---|---|
| Dashboard | `app/(tabs)/index.tsx` | Overview — headcount, this month's payroll, quick actions |
| Employees list | `app/(tabs)/employees.tsx` | Tap a row → employee detail |
| Employee detail | `app/employees/[id].tsx` | Profile, salary, bank info; Edit / Delete |
| Add / Edit employee | `app/employees/add.tsx`, `edit.tsx` | Create and update forms |
| Attendance calendar | `app/(tabs)/attendance.tsx` | Tap-to-mark month grid |
| Payroll runs | `app/(tabs)/payroll.tsx` | List of runs (pending + paid) |
| Review payroll | `app/payroll/review.tsx` | Adjust line items, then finalize |
| Payslips list | `app/payroll/payslips.tsx` | Per-run employee picker |
| Payslip | `app/payroll/payslip.tsx` | Single payslip + PDF/share/WhatsApp |
| Reports | `app/(tabs)/reports.tsx` | Trends + CSV/PDF export |
| Business config | `app/settings/business.tsx` | Reached via the ⚙ gear on the dashboard |
| Login / Signup / Onboarding | `app/login.tsx`, `signup.tsx`, `onboarding.tsx` | Auth + first-run flow |

---

## Tech stack

**Mobile app**
- [Expo](https://docs.expo.dev/versions/v54.0.0/) 54 · React Native 0.81 · React 19
- [expo-router](https://docs.expo.dev/router/introduction/) — file-based routing (typed routes enabled)
- [Tamagui](https://tamagui.dev/) — UI library and styling
- New Architecture enabled
- `expo-secure-store` for token storage (with a localStorage fallback on web)
- Fonts: **Inter** (headings + body), **Geist** (numeric/money data)

**Backend** (`backend/`)
- Spring Boot 4.1 · Java 21
- PostgreSQL (Hibernate/JPA)
- JWT auth (access + hashed, rotating refresh tokens) · BCrypt password hashing
- Multi-tenant (shared schema, `business_id` discriminator, enforced in the repository + service layers)
- springdoc-openapi → Swagger UI
- Dockerized; deploys to Render

---

## Repository layout

```
tinyPayroll/
├── app/                     # expo-router routes (screens)
│   ├── (tabs)/              #   bottom-tab screens
│   ├── employees/           #   detail, add, edit
│   ├── payroll/             #   review, payslips, payslip
│   ├── settings/            #   business config
│   └── _layout.tsx          #   root stack + auth guard
├── src/
│   ├── services/            # API layer (api.ts + one file per domain)
│   ├── types/index.ts       # shared domain types (the API contract)
│   ├── utils/payroll.ts      # salary formula (pure, unit-asserted)
│   └── theme/               # Tamagui config (fonts, tokens)
├── assets/                  # icons, splash, images
├── backend/                 # Spring Boot API (see backend/APIS.md)
├── CLAUDE.md                # engineering guide (design system, conventions)
├── AGENTS.md                # note: read the v54 Expo docs before coding
├── PRD.md                   # backend product & technical requirements
├── TASKS.md                 # frontend↔backend wiring tracker
└── README.md               # you are here
```

`@/` is a path alias for the repo root (e.g. `import { Employee } from '@/src/types'`).

---

## Getting started

### Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** app on your phone, or an Android emulator / iOS simulator
- For the backend: **Java 21** and a **PostgreSQL** database (or Docker)

### 1. Run the backend

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

Defaults to the `dev` profile on port **8080**. Configuration (DB URL, JWT secret, etc.) is supplied via environment variables — see `backend/HELP.md` and copy `.env.example` to `.env`. **Never commit real secrets.**

Once running:
- Swagger UI (interactive API): http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs
- Full endpoint reference: [`backend/APIS.md`](backend/APIS.md)

### 2. Run the mobile app

```bash
npm install
npx expo start
```

Then choose a target from the terminal — Android emulator, iOS simulator, web, or scan the QR code with Expo Go.

> Because the app uses native modules (`expo-secure-store`) and the New Architecture, some features need a **development build** rather than plain Expo Go. See [Building an installable Android APK](#building-an-installable-android-apk).

Useful scripts:

```bash
npm run android          # open on Android emulator
npm run ios              # open on iOS simulator
npm run web              # open in the browser
npm run lint             # ESLint (expo lint)
npx expo start --clear   # clear cache — always run after changing theme/fonts/config
```

### Pointing the app at the backend

The mobile app talks to the API through `src/services/api.ts`. The base URL is resolved per platform:

```ts
const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8080/api/v1'   // Android emulator → host machine
  : 'http://localhost:8080/api/v1';
```

`10.0.2.2` is how the Android **emulator** reaches `localhost` on your dev machine. Important gotchas:

- **On a physical device**, `localhost`/`10.0.2.2` point at the phone, not your computer. Change the base URL to your machine's LAN IP (e.g. `http://192.168.1.x:8080/api/v1`) or a deployed backend URL, and make sure both are on the same network.
- For a **shipped build**, point it at your deployed (HTTPS) backend.

---

## Design system — "Calm Precision"

The full design guide lives in [`CLAUDE.md`](CLAUDE.md). In short:

- **Fonts** — Inter (UI + body), Geist (numbers/money)
- **Primary** — Ink Indigo `#1a1f2c`
- **Accent** — Gold `#d4af37` for money values, the active tab, and primary CTAs
- **Light** bg `#f8f9ff` / surface `#ffffff`; **Dark** bg `#0d0f14` / surface `#161a24`
- **Radius** — 14–18px cards, 10–12px buttons/inputs, pill (`9999`) for chips

Every screen implements light + dark via a local `useC()` hook keyed off `useColorScheme()` — colors are never hardcoded in JSX. Cards get a soft shadow (`cardShadow`); ink hero cards and primary CTAs get a gold-glow shadow (`heroShadow`). See `CLAUDE.md` for the exact token table and the `useC()` implementation.

---

## Salary formula

The single source of truth (client-side mirror of the backend) is `src/utils/payroll.ts`:

```
Final = Base + Overtime + Bonus − UnpaidLeave − Advances − Deductions
```

Always compute via `calculateFinalSalary()` / `buildPayrollItem()` — never inline the arithmetic in a component. The backend recomputes and persists `finalSalary` for every run and is authoritative for finalized runs.

---

## Building an installable Android APK

The app uses native modules, so you need a real build (not Expo Go). Two common paths:

**Cloud build with EAS (recommended)**

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Add an APK profile to `eas.json`:

```json
{
  "build": {
    "preview": { "android": { "buildType": "apk" } }
  }
}
```

Then build and install:

```bash
eas build --platform android --profile preview
```

EAS builds in the cloud and returns a URL/QR — open it on your phone to download and install the APK (allow "install from unknown sources" once).

**Fully local build** (needs Android Studio + JDK):

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## Project conventions

These keep the codebase consistent — see `CLAUDE.md` for the complete list.

- **Layout** uses Tamagui `YStack` / `XStack`, not raw `View` (except for shadow wrappers and progress bars).
- **Text** always uses `<Text fontFamily="$body">` so Tamagui resolves the Inter weight map.
- **Colors** come from the local `useC()` hook as hex values — never custom Tamagui color tokens in JSX.
- **Stack screen headers** are defined once in `app/_layout.tsx`; don't add a manual top bar inside those screens.
- **Bottom sheets** use an absolute-positioned `View` — the Tamagui `Sheet` crashes with `setValue`.
- **Password / keyboard-type inputs** use React Native's native `<TextInput>`, because Tamagui's `<Input>` drops `secureTextEntry` / `keyboardType` (Tamagui issues #2926, #3598).
- Every new screen: pull the design from the Stitch source, match the layout, implement dark mode via `useC()`, and add the appropriate shadows and press-in scale on tappable cards.

---

## Further documentation

| Doc | What's in it |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Engineering guide — design system, `useC()` hook, architecture, screen build status, conventions |
| [`PRD.md`](PRD.md) | Backend product & technical requirements — domain model, security, API design, roadmap |
| [`TASKS.md`](TASKS.md) | Frontend ↔ backend wiring tracker (which screens are on real APIs) |
| [`backend/APIS.md`](backend/APIS.md) | Complete REST API reference with request/response shapes |
| [`backend/HELP.md`](backend/HELP.md) | Backend setup / run help |
| [`backend/TASKS.md`](backend/TASKS.md) | Backend build tracker |
| [`AGENTS.md`](AGENTS.md) | Reminder to read the exact Expo v54 docs before writing code |

---

## Roadmap

Delivered: full MVP — auth, employees, attendance, payroll runs + finalize, payslips (with PDF/share/WhatsApp), reports (CSV/PDF), and business config, all wired to the real backend across both light and dark mode.

Planned (see `PRD.md` §11 and `TASKS.md`):

- **Google OAuth** login (schema already supports it)
- **Automated WhatsApp** payslip delivery (WhatsApp Business API)
- **Staff invites** — multi-user roles (owner/admin/staff already enforced)
- **Email reminders** — payday / attendance-not-marked nudges

---

<sub>Built with Expo + Spring Boot. See <a href="CLAUDE.md">CLAUDE.md</a> for engineering details.</sub>
