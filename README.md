# TinyPayroll

> Dead-simple attendance tracking and monthly payroll for small businesses (5–50 employees).

TinyPayroll is a full-stack payroll app aimed at small business owners — bakeries, traders, small retail, service shops — who need to mark attendance, run payroll once a month, and hand out payslips without a finance team or a DBA. It is a **React Native / Expo** mobile app backed by a **Spring Boot** REST API.

- **Mobile app** — Expo 54, expo-router, React 19, NativeWind v4 (Tailwind). Runs on Android, iOS, and web from one codebase.
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
- [Design system — "Precision & Grace"](#design-system--precision--grace)
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
| **Payroll runs** | Create a draft run for any month — past, present, or future via the period picker. It snapshots the currently **active** employees and auto-seeds line items from attendance (absent days become unpaid-leave deductions). Adjust overtime/bonus/advances/deductions per employee, then finalize to lock it as **Paid**. Runs can be soft-deleted (any status); deleting frees the period so it can be recreated. |
| **Org catalog** | Per-business departments and designations, managed from a dedicated catalog screen. Roles/departments are picked (or created on the fly) when adding/editing employees. |
| **Payslips** | Per-run, per-employee payslip. Export to PDF, share via the native share sheet, or open a prefilled WhatsApp chat with the employee. |
| **Reports** | Year-to-date expense trend, per-period totals, and employee-cost breakdown. Export as CSV or PDF. |
| **Recent activity** | A business-scoped audit feed (employee, business, and payroll changes) surfaced via a "Recent Activity" button on the dashboard that opens a paginated All Activity screen. Pages are cached client-side for 10s to spare the database. |
| **Business config** | Company profile + payroll settings (pay day, working days/month, OT rate, currency) and feature toggles (auto reminders, WhatsApp payslips). |
| **Dark mode** | Every screen fully supports light and dark, driven by the device color scheme. |

Multi-tenant by design: every signed-up business is an isolated tenant, and `businessId` is always derived from the JWT — never trusted from the request.

---

## Screens

All screens are built and support both light and dark mode.

| Screen | Route | Purpose |
|---|---|---|
| Dashboard | `app/(tabs)/index.tsx` | Overview — headcount, present today, this month's payroll, quick actions; "Recent Activity" button |
| All activity | `app/activity.tsx` | Full audit feed — paginated "Show more" with skeleton rows; opened from the dashboard |
| Employees list | `app/(tabs)/employees.tsx` | Tap a row → employee detail |
| Employee detail | `app/employees/[id].tsx` | Profile, salary, bank info; Edit / Delete |
| Add / Edit employee | `app/employees/add.tsx`, `edit.tsx` | Create and update forms; dept/role via searchable ComboBox |
| Attendance calendar | `app/(tabs)/attendance.tsx` | Tap-to-mark month grid |
| Payroll runs | `app/(tabs)/payroll.tsx` | List of runs (pending + paid) |
| Review payroll | `app/payroll/review.tsx` | Adjust line items, then finalize |
| Payslips list | `app/payroll/payslips.tsx` | Per-run employee picker |
| Payslip | `app/payroll/payslip.tsx` | Single payslip + PDF/share/WhatsApp |
| Reports | `app/(tabs)/reports.tsx` | Trends + CSV/PDF export |
| Business config | `app/settings/business.tsx` | Reached via the ⚙ gear on the dashboard |
| Org catalog | `app/settings/catalog.tsx` | Departments & designations CRUD; reached via the sidebar |
| Login / Signup / Onboarding | `app/login.tsx`, `signup.tsx`, `onboarding.tsx` | Auth + first-run flow |

---

## Tech stack

**Mobile app**
- [Expo](https://docs.expo.dev/versions/v54.0.0/) 54 · React Native 0.81 · React 19
- [expo-router](https://docs.expo.dev/router/introduction/) — file-based routing (typed routes enabled)
- [NativeWind](https://www.nativewind.dev/) v4 — Tailwind-based styling (design tokens in `tailwind.config.js`)
- `react-native-reanimated` + `react-native-gesture-handler` — slide-in sidebar (edge-swipe + hamburger)
- New Architecture enabled
- `expo-secure-store` for token storage (with a localStorage fallback on web)
- Fonts: **Roboto** (UI + body), **JetBrains Mono** (numeric/money data)

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
│   ├── settings/            #   business config, org catalog
│   └── _layout.tsx          #   root stack + auth guard
├── src/
│   ├── services/            # API layer (api.ts + one file per domain)
│   ├── types/index.ts       # shared domain types (the API contract)
│   ├── utils/payroll.ts      # salary formula (pure, unit-asserted)
│   └── components/ui/       # shared NativeWind UI (Screen, Card, TopBar, Sidebar, palette…)
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

## Design system — "Precision & Grace"

The full design guide lives in [`CLAUDE.md`](CLAUDE.md). In short:

- **Fonts** — Roboto (UI + body), JetBrains Mono (numbers/money)
- **Primary** — Indigo `#6366f1`
- **Secondary** — Electric Blue `#0ea5e9`
- **Radius** — 14–18px cards, 10–12px buttons/inputs, pill (`9999`) for chips

Styling is done with **NativeWind v4** (Tailwind classes) — design tokens are defined as light/dark pairs in `tailwind.config.js` and applied via className with the `dark:` variant (driven automatically by `useColorScheme()`, no manual color hook). Shared UI primitives live in `src/components/ui/` (`Screen`, `Card`, `AppText`, `TopBar`, `Sidebar`, `usePalette`, `useShadows`). See `CLAUDE.md` for the exact token table.

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

- **Layout** uses raw `View` from `react-native` + `className` (`flex-row` for rows) — NativeWind, not a component library.
- **Text** uses `<AppText className="…">` from `src/components/ui` — defaults to Roboto + primary text color; add `font-mono` for numeric/money data.
- **Colors** come from token classes (`bg-surface-light dark:bg-surface-dark`, etc.) — never hardcode design hex in className. Use `usePalette()` hex only where className can't reach (Ionicons `color`, native `style`, `placeholderTextColor`, StatusBar, attendance status).
- **Dark mode** is the `dark:` variant, driven automatically by `useColorScheme()` — no manual light/dark color hook.
- **Tab headers** use the shared `<TopBar>`; **Stack screen headers** are defined once in `app/_layout.tsx` — don't hand-roll a top bar inside those screens.
- **Bottom-sheet / success overlays** use an absolute-positioned `View` (`className="absolute inset-0 …"`), never a Modal.
- Every new screen: pull the design from the Stitch source, match the layout, use `Screen`/`Card`/`AppText`, implement dark mode via `dark:` classes, and add press-in scale (`pressScale`) on tappable cards.

---

## Further documentation

| Doc | What's in it |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Engineering guide — design system, NativeWind tokens, shared UI, architecture, screen build status, conventions |
| [`PRD.md`](PRD.md) | Backend product & technical requirements — domain model, security, API design, roadmap |
| [`TASKS.md`](TASKS.md) | Frontend ↔ backend wiring tracker (which screens are on real APIs) |
| [`backend/APIS.md`](backend/APIS.md) | Complete REST API reference with request/response shapes |
| [`backend/HELP.md`](backend/HELP.md) | Backend setup / run help |
| [`backend/TASKS.md`](backend/TASKS.md) | Backend build tracker |
| [`AGENTS.md`](AGENTS.md) | Reminder to read the exact Expo v54 docs before writing code |

---

## Roadmap

Delivered: full MVP — auth, employees, attendance, payroll runs + finalize, payslips (with PDF/share/WhatsApp), reports (CSV/PDF), a recent-activity audit feed, and business config, all wired to the real backend across both light and dark mode.

Planned (see `PRD.md` §11 and `TASKS.md`):

- **Google OAuth** login (schema already supports it)
- **Automated WhatsApp** payslip delivery (WhatsApp Business API)
- **Staff invites** — multi-user roles (owner/admin/staff already enforced)
- **Email reminders** — payday / attendance-not-marked nudges

---

<sub>Built with Expo + Spring Boot. See <a href="CLAUDE.md">CLAUDE.md</a> for engineering details.</sub>
